import { render, screen } from '@testing-library/react';
import AIStudio from './AIStudio';

let mockLang = 'en';
let mockGrants = [];
let mockWorkspaceId = 7;
jest.mock('@/i18n', () => ({ useLanguage: () => ({ isPersian: mockLang === 'fa', t: () => 'AI Studio' }) }));
jest.mock('../../core/navigation', () => ({
  AppLink: function MockLink({ to, children, ...rest }) { return <a href={to} {...rest}>{children}</a>; },
}));
jest.mock('../../hooks/useNavigationAccess', () => ({
  __esModule: true, default: () => code => mockGrants.includes(code),
}));
jest.mock('../../hooks/useWorkspaceScope', () => ({
  __esModule: true, default: () => ({ workspaceId: mockWorkspaceId }),
}));
jest.mock('../../components/layout/PageHeader', () => function MockPageHeader({ title, subtitle }) {
  return <header><h1>{title}</h1><p>{subtitle}</p></header>;
});
jest.mock('../../components/ui/Card', () => function MockCard({ as: Tag = 'div', children, ...rest }) {
  return <Tag {...rest}>{children}</Tag>;
});
beforeEach(() => {
  mockLang = 'en';
  mockGrants = [];
  mockWorkspaceId = 7;
});
test('AI tool discovery reuses sidebar permissions and preserves scoped destinations', () => {
  mockGrants = ['composer.view', 'inbox.view', 'ai.brand_voice'];
  const { rerender } = render(<AIStudio />);
  const composer = screen.getByRole('link', { name: /Create post/ });
  expect(composer).toHaveAttribute('href', '/dashboard/analytics/composer?workspace=7');
  expect(screen.getByRole('link', { name: /Inbox/ })).toHaveAttribute('href', '/dashboard/analytics/inbox?workspace=7');
  expect(screen.getByRole('link', { name: /Brand voice/ })).toHaveAttribute('href', '/dashboard/analytics/brand-voice?workspace=7');
  mockWorkspaceId = 8;
  rerender(<AIStudio />);
  expect(screen.getByRole('link', { name: /Create post/ })).toHaveAttribute('href', '/dashboard/analytics/composer?workspace=8');
  expect(document.querySelector('a[href*="workspace=7"]')).toBeNull();
});
test('AI hub does not advertise composer or inbox without effective grants', () => {
  render(<AIStudio />);
  expect(screen.queryByRole('link', { name: /Create post/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Inbox/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Brand voice/ })).not.toBeInTheDocument();
  // Content tools without an explicit grant remain in the existing navigation catalog.
  expect(screen.getByRole('link', { name: /Caption writer/ })).toBeInTheDocument();
});
test('a missing workspace exposes no content action or guessed workspace scope', () => {
  mockWorkspaceId = null;
  render(<AIStudio />);
  expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
test('Persian hub uses native language preference, accessible links and cautious claims', () => {
  mockLang = 'fa';
  mockGrants = ['composer.view'];
  render(<AIStudio />);
  const composer = screen.getByRole('link', { name: /ساخت پست/ });
  expect(composer).toHaveAttribute('href', '/dashboard/analytics/composer?workspace=7');
  expect(screen.getByText(/هیچ پیشنهادی به‌خودی‌خود منتشر نمی‌شود/)).toBeInTheDocument();
  expect(screen.queryByText('Every Ravinta surface in one place')).not.toBeInTheDocument();
});
