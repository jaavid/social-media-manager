import { render, screen } from '@testing-library/react';
import { NavigationProvider } from '../navigation';
import { useRouter, usePathname } from 'next/navigation';
import Protected from './Protected';
import { useSession } from '../session';
jest.mock('../session', () => ({ useSession: jest.fn() }));
jest.mock('../layout/Loading', () => ({
  Loader: () => <div>Loading session</div>,
}));
function setup(session, props = {}) {
  useSession.mockReturnValue(session);
  const router = useRouter();
  router.replace.mockClear();
  router.push.mockClear();
  usePathname.mockReturnValue('/private');
  return render(<NavigationProvider><Protected {...props}><div>Private content</div></Protected></NavigationProvider>);
}
it('waits for session before redirecting', () => {
  setup({ loading: true });
  expect(screen.getByText('Loading session')).toBeInTheDocument();
});
it('redirects anonymous sessions', () => {
  setup({ user: null, loading: false });
  expect(useRouter().replace).toHaveBeenCalledWith('/login', { scroll: true });
  expect(screen.queryByText('Private content')).not.toBeInTheDocument();
});
it('blocks client access to admin routes', () => {
  setup({ user: { role: 'client' } }, { roles: ['superadmin', 'staff'] });
  expect(useRouter().replace).toHaveBeenCalledWith('/dashboard', { scroll: true });
  expect(screen.queryByText('Private content')).not.toBeInTheDocument();
});
it('blocks end users from agency routes', () => {
  setup(
    { user: { role: 'client', account_type: 'end_user' } },
    { accountTypes: ['agency_member'] },
  );
  expect(useRouter().replace).toHaveBeenCalledWith('/u', { scroll: true });
  expect(screen.queryByText('Private content')).not.toBeInTheDocument();
});
it('allows authorized sessions', () => {
  setup({ user: { role: 'staff' } }, { roles: ['staff'] });
  expect(screen.getByText('Private content')).toBeInTheDocument();
});
