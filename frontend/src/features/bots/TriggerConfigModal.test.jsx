import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TriggerConfigModal from './TriggerConfigModal';
import { botAPI } from '@/services/domains/bots';
import { enMessages as mockMessages } from '@/i18n/messages';
jest.mock('@/core/session', () => ({
  useSession: () => ({ user: { id: 1, role: 'client', account_type: 'legacy' } }),
}));
jest.mock('@/services/domains/bots', () => ({ botAPI: { patch: jest.fn(), publish: jest.fn() } }));
jest.mock('@/i18n/index', () => ({
  useLanguage: () => ({ t: (key) => mockMessages[key] || key, tr: (text) => text }),
}));
jest.mock(
  './MetaAdsPicker',
  () =>
    function MetaPicker() {
      return <div>Meta picker fixture</div>;
    },
);
const flow = (id = 1, client = 7) => ({
  id,
  client,
  name: `Flow ${id}`,
  trigger_type: 'keyword',
  trigger_config: { keywords: ['first', 'second'], match_type: 'contains', case_sensitive: false },
});
const publish = () => screen.getByRole('button', { name: 'Publish flow', exact: true });
beforeEach(() => jest.resetAllMocks());
test('pending keyword must be added, order is preserved, save failure retains inputs and retries only on request', async () => {
  const f = flow(),
    published = jest.fn();
  botAPI.patch.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 503, data: { error: 'private token' } },
  });
  render(<TriggerConfigModal flow={f} onClose={jest.fn()} onPublished={published} />);
  const input = screen.getByLabelText('Add keyword');
  fireEvent.change(input, { target: { value: 'third' } });
  expect(publish()).toBeDisabled();
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(publish()).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Match type'), { target: { value: 'exact' } });
  fireEvent.click(screen.getByLabelText('Case-sensitive'));
  fireEvent.click(publish());
  await screen.findByText(mockMessages['editor.publishFailed']);
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(botAPI.patch).toHaveBeenCalledWith(1, {
    trigger_type: 'keyword',
    trigger_config: {
      keywords: ['first', 'second', 'third'],
      match_type: 'exact',
      case_sensitive: true,
    },
  });
  expect(botAPI.publish).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Match type')).toHaveValue('exact');
  expect(screen.getByLabelText('Case-sensitive')).toBeChecked();
  expect(screen.queryByText('private token')).toBeNull();
  botAPI.patch.mockResolvedValueOnce({ data: f });
  botAPI.publish.mockResolvedValueOnce({ data: { ...f, is_active: true } });
  fireEvent.click(publish());
  await waitFor(() => expect(published).toHaveBeenCalledWith({ ...f, is_active: true }));
});
test('rapid flow/workspace switch cannot publish after the old save or overwrite new configuration', async () => {
  let resolve;
  botAPI.patch.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const published = jest.fn(),
    close = jest.fn(),
    view = render(<TriggerConfigModal flow={flow()} onClose={close} onPublished={published} />);
  fireEvent.click(publish());
  expect(screen.getByLabelText('Add keyword')).toBeDisabled();
  expect(screen.getByLabelText('Trigger type')).toBeDisabled();
  view.rerender(
    <TriggerConfigModal
      flow={{ ...flow(2, 8), trigger_config: { keywords: ['new scope'] } }}
      onClose={close}
      onPublished={published}
    />,
  );
  await act(async () => resolve({ data: flow() }));
  expect(botAPI.publish).not.toHaveBeenCalled();
  expect(published).not.toHaveBeenCalled();
  expect(screen.getByText('new scope')).toBeVisible();
  expect(screen.queryByText('first')).toBeNull();
});
test('trigger-type switch preserves each configuration and pending draft separately', () => {
  render(<TriggerConfigModal flow={flow()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Add keyword'), { target: { value: 'pending' } });
  fireEvent.change(screen.getByLabelText('Trigger type'), { target: { value: 'button_reply' } });
  expect(screen.getByLabelText('Add reply ID')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Add reply ID'), { target: { value: 'BUY_NOW' } });
  fireEvent.keyDown(screen.getByLabelText('Add reply ID'), { key: 'Enter' });
  fireEvent.change(screen.getByLabelText('Trigger type'), { target: { value: 'keyword' } });
  expect(screen.getByLabelText('Add keyword')).toHaveValue('pending');
  expect(screen.getByText('first')).toBeVisible();
  expect(publish()).toBeDisabled();
});
test.each(['referral_link', 'button_reply'])(
  '%s entry order and unknown config fields survive failed save',
  async (trigger) => {
    const key = trigger === 'referral_link' ? 'referral_codes' : 'button_payloads';
    const label = trigger === 'referral_link' ? 'Add referral code' : 'Add reply ID';
    botAPI.patch.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { issues: ['private raw issue'] } },
    });
    render(
      <TriggerConfigModal
        flow={{
          ...flow(),
          trigger_type: trigger,
          trigger_config: { [key]: ['one', 'two'], extra: 'keep' },
        }}
        onClose={jest.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(label), { target: { value: 'three' } });
    fireEvent.keyDown(screen.getByLabelText(label), { key: 'Enter' });
    fireEvent.click(publish());
    await screen.findByText(mockMessages['editor.publishFailed']);
    expect(botAPI.patch).toHaveBeenCalledWith(1, {
      trigger_type: trigger,
      trigger_config: { [key]: ['one', 'two', 'three'], extra: 'keep' },
    });
    expect(screen.queryByText('private raw issue')).toBeNull();
  },
);
test('malformed save and unsafe publication failure cannot produce successful publication', async () => {
  const f = flow(),
    published = jest.fn();
  botAPI.patch.mockResolvedValueOnce({ data: {} });
  render(<TriggerConfigModal flow={f} onClose={jest.fn()} onPublished={published} />);
  fireEvent.click(publish());
  await screen.findByText(mockMessages['editor.publishFailed']);
  expect(botAPI.publish).not.toHaveBeenCalled();
  botAPI.patch.mockResolvedValueOnce({ data: f });
  botAPI.publish.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } });
  fireEvent.click(publish());
  await screen.findByText(mockMessages['editor.publishUnknown']);
  expect(publish()).toBeDisabled();
  expect(published).not.toHaveBeenCalled();
});
