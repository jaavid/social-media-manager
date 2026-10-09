import { render, screen, fireEvent } from '@testing-library/react';
import FeatureSidebar from './FeatureSidebar';

let mockPathname = '/workspace/analytics/dashboard';
jest.mock('../../core/navigation', () => ({
  AppNavLink: ({ to, end, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useAppLocation: () => ({ pathname: mockPathname }),
  useAppNavigate: () => jest.fn(),
}));
jest.mock('../../core/session', () => ({ useSession: () => ({ can: () => true }) }));
jest.mock('../../hooks/useData', () => ({ useWorkspaces: () => ({ workspaces: [] }) }));
jest.mock('../../hooks/useWorkspaceScope', () => ({ useScopedBadgeCount: () => 0 }));
jest.mock('../../i18n', () => ({ useLanguage: () => ({ isPersian: false, tr: (text) => text }) }));

beforeEach(() => { mockPathname = '/workspace/analytics/dashboard'; });

test('opens the current group and lets users expand and collapse other groups', () => {
  render(<FeatureSidebar module="analytics" basePath="/workspace" />);
  expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-expanded', 'true');
  const publish = screen.getByRole('button', { name: 'Publish' });
  expect(publish).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'Composer' })).not.toBeInTheDocument();
  fireEvent.click(publish);
  expect(screen.getByRole('link', { name: 'Composer' })).toBeVisible();
  fireEvent.click(publish);
  expect(screen.queryByRole('link', { name: 'Composer' })).not.toBeInTheDocument();
});

test('opens the destination group when the route changes, including nested routes', () => {
  const { rerender } = render(<FeatureSidebar module="analytics" basePath="/workspace" />);
  mockPathname = '/workspace/analytics/posts/42';
  rerender(<FeatureSidebar module="analytics" basePath="/workspace" />);
  expect(screen.getByRole('button', { name: 'Content' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Posts' })).toBeVisible();
});
