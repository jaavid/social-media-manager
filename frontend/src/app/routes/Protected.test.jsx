import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Protected from './Protected';
import { useSession } from '../session';
jest.mock('../session', () => ({ useSession: jest.fn() }));
jest.mock('../layout/Loading', () => ({
  Loader: () => <div>Loading session</div>,
}));
function setup(session, props = {}) {
  useSession.mockReturnValue(session);
  return render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route
          path="/private"
          element={
            <Protected {...props}>
              <div>Private content</div>
            </Protected>
          }
        />
        <Route path="/login" element={<div>Login destination</div>} />
        <Route path="/admin" element={<div>Admin destination</div>} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
it('waits for session before redirecting', () => {
  setup({ loading: true });
  expect(screen.getByText('Loading session')).toBeInTheDocument();
});
it('redirects anonymous sessions', () => {
  setup({ user: null, loading: false });
  expect(screen.getByText('Login destination')).toBeInTheDocument();
});
it('blocks client access to admin routes', () => {
  setup({ user: { role: 'client' } }, { roles: ['superadmin', 'staff'] });
  expect(screen.getByText('Dashboard destination')).toBeInTheDocument();
});
it('blocks end users from agency routes', () => {
  setup(
    { user: { role: 'client', account_type: 'end_user' } },
    { accountTypes: ['agency_member'] },
  );
  expect(screen.getByText('Dashboard destination')).toBeInTheDocument();
});
it('allows authorized sessions', () => {
  setup({ user: { role: 'staff' } }, { roles: ['staff'] });
  expect(screen.getByText('Private content')).toBeInTheDocument();
});
