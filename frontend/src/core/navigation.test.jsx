import { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { AppLink, AppNavLink, NavigationProvider, useAppLocation, useAppNavigate } from './navigation';
function Probe() {
  const navigate = useAppNavigate();
  const location = useAppLocation();
  return <><button onClick={() => navigate('/login', { state: { mfa_token: 'test-mfa' }, replace: true })}>MFA</button><output>{JSON.stringify(location.state)}</output></>;
}
beforeEach(() => {
  usePathname.mockReturnValue('/auth/callback');
  useSearchParams.mockReturnValue(new URLSearchParams());
  window.history.replaceState({}, '', '/auth/callback');
  useRouter().replace.mockClear();
  useRouter().push.mockClear();
});
test('MFA state is available before the next page mounts and survives Back', () => {
  const view = render(<NavigationProvider><Probe /></NavigationProvider>);
  fireEvent.click(screen.getByText('MFA'));
  expect(screen.getByRole('status')).toHaveTextContent('test-mfa');
  expect(useRouter().replace).toHaveBeenCalledWith('/login', { scroll: true });
  window.history.replaceState({}, '', '/login');
  usePathname.mockReturnValue('/login');
  view.rerender(<NavigationProvider><Probe /></NavigationProvider>);
  expect(window.history.state.usr).toEqual({ mfa_token: 'test-mfa' });
  window.history.replaceState({ usr: { restored: true } }, '', '/login');
  fireEvent(window, new PopStateEvent('popstate'));
  expect(screen.getByRole('status')).toHaveTextContent('restored');
});
test('native click intercepts ordinary navigation and retains modified click behavior', () => {
  render(<NavigationProvider><AppLink to="/privacy">Privacy</AppLink></NavigationProvider>);
  fireEvent.click(screen.getByText('Privacy'), { ctrlKey: true });
  expect(useRouter().push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Privacy'));
  expect(useRouter().push).toHaveBeenCalledWith('/privacy', { scroll: true });
});
test('active nav links honor exact matches', () => {
  usePathname.mockReturnValue('/admin/users');
  render(<NavigationProvider><AppNavLink to="/admin">Admin</AppNavLink><AppNavLink to="/admin" end>Exact</AppNavLink></NavigationProvider>);
  expect(screen.getByText('Admin')).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Exact')).not.toHaveAttribute('aria-current');
});
test('fragment-only navigation retains state without remounting a route', () => {
  function HashProbe() {
    const navigate = useAppNavigate();
    const location = useAppLocation();
    return <><button onClick={() => navigate('#mfa', { state: { step: 2 } })}>Fragment</button><output>{location.hash}</output></>;
  }
  render(<NavigationProvider><HashProbe /></NavigationProvider>);
  fireEvent.click(screen.getByText('Fragment'));
  expect(screen.getByRole('status')).toHaveTextContent('#mfa');
  expect(window.history.state.usr).toEqual({ step: 2 });
  expect(useRouter().push).not.toHaveBeenCalled();
});

test('callback mount redirect retains state until the destination commits', () => {
  function Callback() {
    const navigate = useAppNavigate();
    useEffect(() => { navigate('/login', { state: { mfaToken: 'mount-mfa' }, replace: true }); }, [navigate]);
    return null;
  }
  const view = render(<NavigationProvider><Callback /><Probe /></NavigationProvider>);
  expect(screen.getByRole('status')).toHaveTextContent('mount-mfa');
  window.history.replaceState({}, '', '/login');
  usePathname.mockReturnValue('/login');
  view.rerender(<NavigationProvider><Probe /></NavigationProvider>);
  expect(window.history.state.usr).toEqual({ mfaToken: 'mount-mfa' });
});
