import { render, screen, waitFor } from '@testing-library/react';
import StatusPage from './StatusPage';
jest.mock('../components/Meta', () => () => null);
afterEach(() => jest.restoreAllMocks());
test('current health without history cannot invent uptime or incidents', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ overall: 'outage', services: [{ id: 'api', name: 'API', status: 'outage' }] }) });
  render(<StatusPage />);
  await waitFor(() => expect(screen.getAllByText('قطعی عمده')).toHaveLength(2));
  expect(screen.getByText('تاریخچهٔ پایش در دسترس نیست')).toBeInTheDocument();
  expect(screen.queryByText(/100\.00|90|۹۰/)).not.toBeInTheDocument();
  expect(screen.getByText('تاریخچهٔ حوادث در دسترس نیست.')).toBeInTheDocument();
});
test('failed monitoring reports unknown instead of operational services', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  render(<StatusPage />);
  expect(await screen.findByText('API در دسترس نیست؛ وضعیت فعلی سرویس‌ها نامشخص است')).toBeInTheDocument();
  expect(screen.queryByText('در حال فعالیت')).not.toBeInTheDocument();
});
