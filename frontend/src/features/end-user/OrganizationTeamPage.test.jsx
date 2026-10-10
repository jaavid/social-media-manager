import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrganizationTeamPage from './OrganizationTeamPage';
import { organizationAPI } from '@/services/domains/identity';

jest.mock('../../core/session', () => ({ useSession: () => ({ user: { id: 1, email: 'owner@example.com' }, refreshAuth: jest.fn() }) }));
jest.mock('../../core/navigation', () => ({ AppLink: ({ to, children }) => <a href={to}>{children}</a> }));
jest.mock('../../components/ui/Button', () => ({ __esModule: true, default: ({ variant, children, ...props }) => <button {...props}>{children}</button> }));
jest.mock('../../components/ui/Input', () => ({ __esModule: true, default: ({ label, ...props }) => <label>{label}<input {...props} /></label> }));
jest.mock('@/services/domains/identity', () => ({ organizationAPI: {
  list: jest.fn(), myInvitations: jest.fn(), workspaces: jest.fn(), members: jest.fn(), invitations: jest.fn(),
  create: jest.fn(), createWorkspace: jest.fn(), invite: jest.fn(), updateMember: jest.fn(),
  acceptInvitation: jest.fn(), selectWorkspace: jest.fn(),
} }));
const owner = { id: 1, name: 'Negative Five', owner_user: 1, my_role: 'owner', requires_approval: true };

beforeEach(() => {
  jest.clearAllMocks();
  organizationAPI.list.mockResolvedValue({ data: [owner] });
  organizationAPI.myInvitations.mockResolvedValue({ data: [] });
  organizationAPI.workspaces.mockResolvedValue({ data: [{ id: 10, company: 'Sky Den' }, { id: 11, company: 'School' }] });
  organizationAPI.members.mockResolvedValue({ data: [] });
  organizationAPI.invitations.mockResolvedValue({ data: [] });
});

test('owner invites a designer only to the selected brand', async () => {
  organizationAPI.invite.mockResolvedValue({ data: { email_sent: true } });
  render(<OrganizationTeamPage />);
  await screen.findByRole('heading', { name: 'دعوت همکار' });
  fireEvent.change(screen.getByLabelText('ایمیل همکار'), { target: { value: 'designer@example.com' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Sky Den' }));
  fireEvent.click(screen.getByRole('button', { name: 'ارسال دعوت' }));
  await waitFor(() => expect(organizationAPI.invite).toHaveBeenCalledWith('1', {
    email: 'designer@example.com', organization_role: 'member',
    workspace_grants: [{ workspace_id: 10, preset: 'designer' }],
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('دعوت ارسال شد');
});

test('a failed email is shown honestly without discarding the entered invitation', async () => {
  organizationAPI.invite.mockResolvedValue({ data: { email_sent: false } });
  render(<OrganizationTeamPage />);
  await screen.findByRole('heading', { name: 'دعوت همکار' });
  fireEvent.change(screen.getByLabelText('ایمیل همکار'), { target: { value: 'designer@example.com' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'School' }));
  fireEvent.click(screen.getByRole('button', { name: 'ارسال دعوت' }));
  expect(await screen.findByRole('status')).toHaveTextContent('ارسال ایمیل تأیید نشد');
  expect(screen.getByLabelText('ایمیل همکار')).toHaveValue('designer@example.com');
});

test('ordinary members see their brands without team management controls', async () => {
  organizationAPI.list.mockResolvedValue({ data: [{ ...owner, my_role: 'member' }] });
  render(<OrganizationTeamPage />);
  await screen.findByRole('heading', { name: 'برندهای Negative Five' });
  await screen.findAllByRole('link', { name: 'اتصال شبکه‌های اجتماعی' });
  expect(screen.queryByRole('heading', { name: 'دعوت همکار' })).not.toBeInTheDocument();
  expect(organizationAPI.members).not.toHaveBeenCalled();
  expect(organizationAPI.invitations).not.toHaveBeenCalled();
  expect(screen.getAllByRole('link', { name: 'اتصال شبکه‌های اجتماعی' })[0]).toHaveAttribute('href', '/u/connections?workspace=10');
});
