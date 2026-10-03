import { render, screen, act } from '@testing-library/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppProviders from './AppProviders';
import { useSession } from '../session';
jest.mock('../session', () => ({ useSession: jest.fn() }));
jest.mock('../../hooks/useAuth', () => ({ AuthProvider: ({ children }) => children }));
jest.mock('../../hooks/useTheme', () => ({ ThemeProvider: ({ children }) => children }));
jest.mock('../../hooks/useRealtime', () => ({ RealtimeProvider: ({ children }) => children }));
jest.mock('../../components/RealtimeBridge', () => () => null);
jest.mock('../ClientRuntime', () => () => null);
jest.mock('../../components/PageviewTracker', () => () => null);
jest.mock('../../components/ui/toast', () => ({ ToastProvider: () => null }));
jest.mock('next/dynamic', () => () => () => null);
let client;
function Probe() {
  client = useQueryClient();
  const { data } = useQuery({ queryKey: ['private'], queryFn: async () => 'new request', enabled: false });
  return <output>{data || 'empty'}</output>;
}
test('logout and account changes remount observers on an empty query cache', async () => {
  useSession.mockReturnValue({ user: { id: 1, email: 'first@example.test', role: 'staff' } });
  const view = render(<AppProviders><Probe /></AppProviders>);
  const first = client;
  await act(async () => { first.setQueryData(['private'], 'first account'); });
  expect(await screen.findByText('first account')).toBeVisible();
  useSession.mockReturnValue({ user: null });
  view.rerender(<AppProviders><Probe /></AppProviders>);
  expect(screen.getByText('empty')).toBeVisible();
  expect(client).not.toBe(first);
  expect(first.getQueryData(['private'])).toBeUndefined();
  const anonymous = client;
  useSession.mockReturnValue({ user: { id: 2, email: 'second@example.test', role: 'staff' } });
  view.rerender(<AppProviders><Probe /></AppProviders>);
  expect(screen.getByText('empty')).toBeVisible();
  expect(client).not.toBe(anonymous);
});
