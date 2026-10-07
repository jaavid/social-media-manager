import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationPreferencesPage from './NotificationPreferencesPage';
import { notificationPrefsAPI } from '../../services/api';
import { setLanguage } from '../../i18n';

jest.mock('@/core/session', () => ({ useSession: () => ({ status: 'authenticated', user: { id: 7, role: 'client', client_id: 12 } }) }));
jest.mock('../../services/api', () => ({ notificationPrefsAPI: { get: jest.fn(), update: jest.fn() } }));
jest.mock('../../components/ui/toast', () => ({ success: jest.fn(), error: jest.fn() }));
let client;
beforeEach(() => { client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); });
afterEach(() => client.clear());
const mount = () => render(<QueryClientProvider client={client}><NotificationPreferencesPage /></QueryClientProvider>);
const response = enabled => ({ data: {
  events: [{ id: 'post_published', label: 'Post published' }],
  channels: [{ id: 'in_app', label: 'In-app' }, { id: 'email', label: 'Email' }],
  matrix: [{ event_type: 'post_published', in_app: true, email: enabled }],
} });

test('reads flat booleans, saves only changed cells and reloads the canonical matrix', async () => {
  window.history.replaceState({}, '', '/u/notifications');
  setLanguage('en');
  notificationPrefsAPI.get.mockResolvedValueOnce(response(false)).mockResolvedValue(response(true));
  notificationPrefsAPI.update.mockResolvedValue({ data: { updated: 1 } });
  const view = mount();
  const email = await screen.findByRole('checkbox', { name: 'Post published · Email' });
  expect(email).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Post published · In-app' })).toBeChecked();
  fireEvent.click(email);
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(notificationPrefsAPI.update).toHaveBeenCalledWith([
    { event_type: 'post_published', channel: 'email', enabled: true },
  ]));
  await waitFor(() => expect(screen.getByRole('button', { name: 'No changes' })).toBeDisabled());
  view.unmount();
  mount();
  expect(await screen.findByRole('checkbox', { name: 'Post published · Email' })).toBeChecked();
});

test('Persian labels distinguish event and channel', async () => {
  setLanguage('fa');
  notificationPrefsAPI.get.mockResolvedValue(response(false));
  mount();
  expect(await screen.findByRole('checkbox', { name: 'انتشار پست · ایمیل' })).not.toBeChecked();
  expect(screen.getByRole('heading', { name: 'اعلان‌ها' })).toBeInTheDocument();
});
