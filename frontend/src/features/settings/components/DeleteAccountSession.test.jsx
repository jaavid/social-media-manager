import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { useSession } from '@/core/session';
import { NavigationProvider } from '@/core/navigation';
import Protected from '@/core/routes/Protected';
import { useRouter } from 'next/navigation';
import { api } from '@/services/http/client';
import { authAPI, profileAPI } from '@/services/domains/identity';
import { enMessages as mockMessages } from '@/i18n/messages';
import DeleteAccountSection from './DeleteAccountSection';

jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => mockMessages[key], tr: value => value }) }));
jest.mock('@/services/domains/identity', () => ({ authAPI: { me: jest.fn() }, profileAPI: { deleteAccount: jest.fn() } }));
jest.mock('@/services/http/client', () => ({ api: { delete: jest.fn() } }));
jest.mock('@/lib/auth/browser', () => ({ migrateLegacySession: jest.fn(() => Promise.resolve()) }));
const user = { id: 1, role: 'client', client_id: 7, workspace_id: 7, account_type: 'legacy', email: 'fixture@example.test', permissions: {} };
function BoundDelete({ navigate }) {
  const session = useSession();
  return <DeleteAccountSection logout={session.logout} navigate={navigate} />;
}
test('actual session invalidation and protected routing exit after a verified delete without replay', async () => {
  authAPI.me.mockResolvedValue({ data: user });
  profileAPI.deleteAccount.mockResolvedValue({ data: { detail: 'Your account has been permanently deleted.' } });
  let finishLogout;
  api.delete.mockImplementation(() => new Promise(resolve => { finishLogout = resolve; }));
  const navigate = jest.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = useRouter();
  router.replace.mockClear();
  const view = render(<QueryClientProvider client={client}><AuthProvider><NavigationProvider><Protected><BoundDelete navigate={navigate} /></Protected></NavigationProvider></AuthProvider></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: mockMessages['privacy.immediateTitle'] }));
  fireEvent.change(screen.getByLabelText(mockMessages['privacy.typeDelete']), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: mockMessages['account.confirm'] }));
  await screen.findByText(mockMessages['privacy.immediateConfirmed']);
  expect(profileAPI.deleteAccount).toHaveBeenCalledTimes(1);
  await act(async () => { finishLogout({ status: 204 }); });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?next=/), { scroll: true }));
  expect(screen.queryByText(mockMessages['privacy.immediateTitle'])).not.toBeInTheDocument();
  expect(profileAPI.deleteAccount).toHaveBeenCalledTimes(1);
  expect(api.delete).toHaveBeenCalledWith('/auth/session/');
  view.unmount();
  client.clear();
});
