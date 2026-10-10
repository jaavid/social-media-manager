import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlatformConnectModal from './PlatformConnectModal';
import { connectionsAPI } from '@/services/domains/connections';
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => key, tr: value => value, isPersian: false }) }));
jest.mock('@/services/domains/connections', () => ({ connectionsAPI: { connect: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); connectionsAPI.connect.mockResolvedValue(undefined); });
test('credential normalization follows auth fields and preserves intentional secret whitespace', async () => {
  const provider = { key: 'contract_example', titles: { en: 'Fixture', fa: 'نمونه' }, contract: { auth: { fields: [
    { key: 'token', title_en: 'Fixture token', title_fa: 'توکن', secret: true, required: true, normalization: 'trim' },
    { key: 'destination_id', title_en: 'Fixture destination', title_fa: 'مقصد', secret: false, required: true, normalization: 'trim' },
    { key: 'password', title_en: 'Fixture secret', title_fa: 'رمز', secret: true, required: true, normalization: 'preserve' },
  ] } } };
  render(<PlatformConnectModal open provider={provider} workspaceId={7} account={{ id: 10 }} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Fixture token'), { target: { value: ' fixture-token  ' } });
  fireEvent.change(screen.getByLabelText('Fixture destination'), { target: { value: ' destination  ' } });
  fireEvent.change(screen.getByLabelText('Fixture secret'), { target: { value: ' intentional fixture whitespace  ' } });
  fireEvent.submit(screen.getByLabelText('Fixture token').closest('form'));
  await waitFor(() => expect(connectionsAPI.connect).toHaveBeenCalledWith(7, 'contract_example', {
    token: 'fixture-token', destination_id: 'destination', password: ' intentional fixture whitespace  ',
  }, 10));
});

test('managed bot flow shows project identity and submits only the channel', async () => {
  const provider = { key: 'telegram', titles: { en: 'Telegram', fa: 'تلگرام' }, managed_bot: { username: 'project_bot', configured: true, verification_code: 'fixture-code', verification_token: 'fixture-challenge' },
    contract: { auth: { strategy: 'managed_bot', fields: [
      { key: 'destination_id', title_en: 'Channel ID', title_fa: 'شناسه کانال', secret: false, required: true, normalization: 'trim' },
    ] } } };
  render(<PlatformConnectModal open provider={provider} workspaceId={7} onClose={jest.fn()} />);
  expect(screen.getByText('@project_bot')).toBeInTheDocument();
  expect(screen.getByText('botConnect.permissionHelp')).toBeInTheDocument();
  expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Channel ID'), { target: { value: ' @channel ' } });
  fireEvent.submit(screen.getByLabelText('Channel ID').closest('form'));
  await waitFor(() => expect(connectionsAPI.connect).toHaveBeenCalledWith(7, 'telegram', { destination_id: '@channel', verification_token: 'fixture-challenge' }, undefined));
});

test('unconfigured managed bot cannot be connected', () => {
  const provider = { key: 'bale', titles: { en: 'Bale', fa: 'بله' }, managed_bot: { username: '', configured: false },
    contract: { auth: { strategy: 'managed_bot', fields: [
      { key: 'destination_id', title_en: 'Channel ID', title_fa: 'شناسه کانال', required: true },
    ] } } };
  render(<PlatformConnectModal open provider={provider} workspaceId={7} />);
  expect(screen.getByText('botConnect.notConfigured')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'botConnect.verifyChannel' })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText('Channel ID').closest('form'));
  expect(connectionsAPI.connect).not.toHaveBeenCalled();
});

test('permission failure keeps the channel form open with an actionable error', async () => {
  connectionsAPI.connect.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { code: 'permission_denied' } } });
  const onClose = jest.fn();
  const provider = { key: 'telegram', titles: { en: 'Telegram', fa: 'تلگرام' }, managed_bot: { username: 'project_bot', configured: true, verification_code: 'fixture-code', verification_token: 'fixture-challenge' },
    contract: { auth: { strategy: 'managed_bot', fields: [
      { key: 'destination_id', title_en: 'Channel ID', title_fa: 'شناسه کانال', required: true, normalization: 'trim' },
    ] } } };
  render(<PlatformConnectModal open provider={provider} workspaceId={7} onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Channel ID'), { target: { value: '@channel' } });
  fireEvent.submit(screen.getByLabelText('Channel ID').closest('form'));
  await screen.findByText('botConnect.permissionDenied');
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Channel ID')).toHaveValue('@channel');
});
