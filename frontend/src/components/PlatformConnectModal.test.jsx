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
