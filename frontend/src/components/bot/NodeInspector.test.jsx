import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NodeInspector from './NodeInspector';
import { aiPersonaAPI, botAPI } from '@/services/domains/bots';
import { enMessages as mockMessages } from '@/i18n/messages';
jest.mock('@/services/domains/bots', () => ({ aiPersonaAPI: { build: jest.fn() }, botAPI: { list: jest.fn() } }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), mockMessages[key] || key), tr: text => text }) }));
const node = (id, type, data) => ({ id, data: { type, data } });
function setup(initial) {
  const change = jest.fn(), draft = jest.fn();
  function Harness({ current }) {
    const [drafts, setDrafts] = useState({});
    return <NodeInspector workspaceId={7} node={current} onChange={change} drafts={drafts}
      onDraftChange={(owner, name, entry) => { draft(owner, name, entry); setDrafts(previous => ({ ...previous, [owner]: { ...previous[owner], [name]: entry } })); }} />;
  }
  const view = render(<Harness current={initial} />);
  return { change, draft, ...view, select: next => view.rerender(<Harness current={next} />) };
}
beforeEach(() => jest.resetAllMocks());
test('JSON fallback belongs to its node, preserves invalid draft, and replaces valid object', () => {
  const original = node('a', 'extension_a', { remove: true, keep: 1 });
  const view = setup(original), label = mockMessages['bot.rawJson'];
  fireEvent.change(screen.getByLabelText(label), { target: { value: '{invalid' } });
  fireEvent.blur(screen.getByLabelText(label));
  expect(view.change).not.toHaveBeenCalled();
  expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
  view.select(node('b', 'extension_b', { other: 2 }));
  expect(screen.getByLabelText(label)).toHaveValue(JSON.stringify({ other: 2 }, null, 2));
  expect(view.change).not.toHaveBeenCalled();
  view.select(original);
  expect(screen.getByLabelText(label)).toHaveValue('{invalid');
  for (const text of ['[]', 'null', '1', '"text"', '']) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: text } });
    fireEvent.blur(screen.getByLabelText(label));
    expect(view.change).not.toHaveBeenCalled();
  }
  fireEvent.change(screen.getByLabelText(label), { target: { value: '{"keep":3}' } });
  expect(view.draft.mock.calls.at(-1)[2].valid).toBe(false);
  fireEvent.blur(screen.getByLabelText(label));
  expect(view.change).toHaveBeenLastCalledWith({ keep: 3 }, 'a');
  expect(view.draft.mock.calls.at(-1)[2].valid).toBe(true);
});
test('headers JSON accepts editable object without discarding other webhook fields', () => {
  const view = setup(node('a', 'webhook', { url: 'https://example.test', headers: { Old: 'value' }, body_template: '{{contact.name}}' }));
  const input = screen.getByLabelText('Headers (JSON)');
  fireEvent.change(input, { target: { value: '{"New":"{{contact.phone}}"}' } });
  expect(input).toHaveValue('{"New":"{{contact.phone}}"}');
  expect(view.change).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(view.change).toHaveBeenLastCalledWith({ url: 'https://example.test', headers: { New: '{{contact.phone}}' }, body_template: '{{contact.name}}' }, 'a');
});
test('numeric intermediate input never becomes zero, clamp or another node edit', () => {
  const original = node('a', 'wait_delay', { hours: 2, minutes: 3, seconds: 4 });
  const view = setup(original);
  const input = screen.getByLabelText('Hours');
  fireEvent.change(input, { target: { value: '-' } });
  expect(input).toHaveValue('-');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(view.change).not.toHaveBeenCalled();
  view.select(node('b', 'wait_delay', { hours: 9 }));
  expect(screen.getByLabelText('Hours')).toHaveValue('9');
  view.select(original);
  expect(screen.getByLabelText('Hours')).toHaveValue('-');
  fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '5.5' } });
  expect(view.change).toHaveBeenLastCalledWith({ hours: 5.5, minutes: 3, seconds: 4 }, 'a');
});
test('required labels and help/error association use canonical controls; interpolation preserved', () => {
  const view = setup(node('a', 'message_text', { text: 'Hi ' }));
  const input = screen.getByLabelText('Message');
  expect(input).toBeRequired();
  fireEvent.change(input, { target: { value: '' } });
  view.select(node('a', 'message_text', { text: '' }));
  expect(screen.getByLabelText('Message')).toHaveAttribute('aria-describedby');
  expect(view.draft.mock.calls.at(-1)[2].valid).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /Insert variable/ }));
  fireEvent.click(screen.getByRole('button', { name: '{{contact.name}}', exact: true }));
  expect(view.change).toHaveBeenLastCalledWith({ text: '{{contact.name}}' }, 'a');
  expect(view.draft.mock.calls.at(-1)[2].valid).toBe(true);
});
test('button item edits preserve ID, order and unknown data', () => {
  const data = { extra: 'keep', body: 'Choose', buttons: [{ id: 'first', title: 'First' }, { id: 'second', title: 'Second' }] };
  const view = setup(node('a', 'message_buttons', data));
  fireEvent.change(screen.getByLabelText('Button 2 title'), { target: { value: 'Changed' } });
  expect(view.change).toHaveBeenLastCalledWith({ ...data, buttons: [data.buttons[0], { ...data.buttons[1], title: 'Changed' }] }, 'a');
});
test('bounded numeric fields reject invalid ranges without clamping', () => {
  const view = setup(node('a', 'ai_chat', { max_turns: 12, max_tokens: 256 }));
  fireEvent.change(screen.getByLabelText('Max turns before exit'), { target: { value: '51' } });
  expect(view.change).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Max turns before exit')).toHaveValue('51');
  expect(screen.getByLabelText('Max turns before exit')).toHaveAttribute('aria-invalid', 'true');
});
test('late persona response after node switch cannot apply to new node', async () => {
  let resolve;
  aiPersonaAPI.build.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const view = setup(node('a', 'ai_chat', {}));
  fireEvent.click(screen.getByRole('button', { name: /Build with AI/ }));
  fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Keep input' } });
  fireEvent.click(screen.getByRole('button', { name: 'Build persona' }));
  view.select(node('b', 'message_text', { text: 'New node' }));
  await act(async () => resolve({ data: { persona: 'Old response' } }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(view.change).not.toHaveBeenCalled();
});
test('persona failure keeps inputs and surfaces a safe focused error', async () => {
  aiPersonaAPI.build.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: { error: 'private token' } } });
  setup(node('a', 'ai_chat', {}));
  fireEvent.click(screen.getByRole('button', { name: /Build with AI/ }));
  fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Keep input' } });
  fireEvent.click(screen.getByRole('button', { name: 'Build persona' }));
  await screen.findByText(mockMessages['bot.personaFailed']);
  expect(screen.getByLabelText('Business name')).toHaveValue('Keep input');
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.queryByText('private token')).toBeNull();
});
test('active-flow read is scoped, malformed data is failure and node switch aborts old read', async () => {
  let resolve, signal;
  botAPI.list.mockImplementationOnce((params, s) => { signal = s; return new Promise(done => { resolve = done; }); });
  const view = setup(node('a', 'jump_to_flow', {}));
  await waitFor(() => expect(botAPI.list).toHaveBeenCalledWith({ workspace_id: 7, active: '1' }, expect.any(AbortSignal)));
  view.select(node('b', 'message_text', { text: 'Second' }));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: [] }));
  expect(screen.queryByLabelText('Target flow')).toBeNull();
  botAPI.list.mockResolvedValueOnce({ data: {} });
  view.select(node('c', 'jump_to_flow', { target_flow_id: 99 }));
  await screen.findByText(mockMessages['bot.jumpFailed']);
  expect(view.change).not.toHaveBeenCalled();
});
