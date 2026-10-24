import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountControls from './AccountControls';
import { organizationAPI } from '@/services/domains/identity';

const mockLogout = jest.fn();
const mockRefresh = jest.fn();
const mockNavigate = jest.fn();
const mockSetSearch = jest.fn();
jest.mock('@/core/session', () => ({ useSession: () => ({ user: { id: 1 }, logout: mockLogout, refreshAuth: mockRefresh }) }));
jest.mock('@/core/navigation', () => ({ useAppLocation: () => ({ pathname: '/u/calendar' }), useAppNavigate: () => mockNavigate, useAppSearchParams: () => [new URLSearchParams('workspace=10'), mockSetSearch] }));
jest.mock('@/hooks/useWorkspaceScope', () => ({ __esModule: true, default: () => ({ workspaceId: 10 }) }));
jest.mock('@/hooks/useData', () => ({ useWorkspaces: () => ({ workspaces: [{ id: 10, organization: 1, company: 'A' }, { id: 11, organization: 1, company: 'B' }] }) }));
jest.mock('@/services/domains/identity', () => ({ organizationAPI: { selectWorkspace: jest.fn() } }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ isPersian: false, tr: value => value }) }));

beforeEach(() => { jest.resetAllMocks(); });
test('persists the selected brand then refreshes session and URL scope', async () => {
  render(<AccountControls />);
  fireEvent.change(screen.getByLabelText('Switch brand'), { target: { value: '11' } });
  await waitFor(() => expect(mockSetSearch).toHaveBeenCalled());
  expect(organizationAPI.selectWorkspace).toHaveBeenCalledWith(1, 11);
  expect(mockRefresh).toHaveBeenCalled();
  expect(mockSetSearch.mock.calls[0][0].get('workspace')).toBe('11');
});
test('does not change the scope when server selection fails', async () => {
  organizationAPI.selectWorkspace.mockRejectedValue(new Error('denied'));
  render(<AccountControls />);
  fireEvent.change(screen.getByLabelText('Switch brand'), { target: { value: '11' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Brand change could not be confirmed');
  expect(mockSetSearch).not.toHaveBeenCalled();
});
test('waits for server logout before navigating', async () => {
  let finish;
  mockLogout.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AccountControls />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(mockNavigate).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }));
});
test('failed logout keeps the user on the page and allows retry', async () => {
  mockLogout.mockRejectedValue(new Error('offline'));
  render(<AccountControls />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed');
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
});
