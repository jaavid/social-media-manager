import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TriggerConfigModal from './TriggerConfigModal';
import TestModeDrawer from './TestModeDrawer';
import { botAPI, botConversationAPI } from '@/services/api';
jest.mock('@/i18n', () => ({
  useLanguage: () => ({ t: (key) => key, tr: (value) => value, isPersian: false }),
}));
jest.mock('./MetaAdsPicker', () => () => null);
jest.mock('@/services/api', () => ({
  botAPI: { patch: jest.fn(), publish: jest.fn(), test: jest.fn() },
  botConversationAPI: { get: jest.fn(), end: jest.fn() },
}));
const flow = {
  id: 1,
  client: 7,
  name: 'Fixture flow',
  trigger_type: 'manual',
  trigger_config: {},
  is_active: false,
};
beforeEach(() => {
  jest.clearAllMocks();
  botAPI.patch.mockResolvedValue({ status: 200, data: flow });
});
test('malformed publication is ambiguous and cannot double submit or claim success', async () => {
  const published = jest.fn();
  let finish;
  botAPI.publish.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<TriggerConfigModal flow={flow} onClose={jest.fn()} onPublished={published} />);
  const publish = screen.getByRole('button', { name: 'editor.publishAction' });
  fireEvent.click(publish);
  fireEvent.click(publish);
  await waitFor(() => expect(botAPI.publish).toHaveBeenCalledTimes(1));
  await act(async () => finish({ status: 200, data: {} }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  expect(publish).toBeDisabled();
  expect(published).not.toHaveBeenCalled();
  expect(botAPI.patch).toHaveBeenCalledTimes(1);
});
test('approval is a pending acknowledgement and keeps trigger choices', async () => {
  botAPI.publish.mockResolvedValue({ status: 202, data: { requires_approval: true } });
  const published = jest.fn();
  render(<TriggerConfigModal flow={flow} onClose={jest.fn()} onPublished={published} />);
  fireEvent.click(screen.getByRole('button', { name: 'editor.publishAction' }));
  await screen.findByText('editor.approvalQueued');
  expect(published).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'editor.publishAction' })).toBeDisabled();
});
test('test failure preserves phone, exposes no raw error and never replays an ambiguous run', async () => {
  botAPI.test.mockRejectedValue({
    isAxiosError: true,
    message: 'private upstream token',
    response: { status: 503, data: { error: 'private upstream token' }, headers: {} },
  });
  render(<TestModeDrawer flow={flow} onClose={jest.fn()} />);
  const phone = screen.getByLabelText('editor.testPhone');
  fireEvent.change(phone, { target: { value: '+12025550123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run', exact: true }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  expect(phone).toHaveValue('+12025550123');
  expect(screen.getByRole('button', { name: 'Run', exact: true })).toBeDisabled();
  expect(screen.queryByText('private upstream token')).not.toBeInTheDocument();
  expect(botAPI.test).toHaveBeenCalledTimes(1);
});
test('failed stop preserves actual running state and previous conversation', async () => {
  botAPI.test.mockResolvedValue({ data: { conversation_id: 9 } });
  botConversationAPI.get.mockResolvedValue({
    data: { id: 9, flow: 1, client: 7, status: 'active', steps: [] },
  });
  botConversationAPI.end.mockRejectedValue(new Error('Network failed'));
  render(<TestModeDrawer flow={flow} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('editor.testPhone'), {
    target: { value: '+12025550123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Run', exact: true }));
  const stop = await screen.findByRole('button', { name: 'Stop', exact: true });
  fireEvent.click(stop);
  await waitFor(() =>
    expect(screen.getByText('editor.testFailed').closest('[data-data-state]')).toHaveFocus(),
  );
  expect(stop).toBeVisible();
  expect(screen.getByText('active', { exact: true })).toBeVisible();
  expect(botConversationAPI.end).toHaveBeenCalledTimes(1);
});
