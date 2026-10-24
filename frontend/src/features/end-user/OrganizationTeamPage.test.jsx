import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrganizationTeamPage from './OrganizationTeamPage';
import { organizationAPI } from '@/services/domains/identity';

const mockSessionUser = { id: 1, email: 'owner@example.com' };
jest.mock('../../core/session', () => ({ useSession: () => ({ user: mockSessionUser, refreshAuth: jest.fn() }) }));
jest.mock('../../core/navigation', () => ({ AppLink: ({ to, children }) => <a href={to}>{children}</a> }));
jest.mock('../../components/ui/Button', () => ({ __esModule: true, default: ({ variant, children, ...props }) => <button data-variant={variant} {...props}>{children}</button> }));
jest.mock('../../components/ui/Input', () => ({ __esModule: true, default: ({ label, ...props }) => <label>{label}<input {...props} /></label> }));
jest.mock('@/services/domains/identity', () => ({ organizationAPI: {
  list: jest.fn(), myInvitations: jest.fn(), workspaces: jest.fn(), members: jest.fn(), invitations: jest.fn(),
  create: jest.fn(), createWorkspace: jest.fn(), invite: jest.fn(), updateMember: jest.fn(),
  acceptInvitation: jest.fn(), selectWorkspace: jest.fn(),
} }));
const owner = { id: 1, name: 'Negative Five', owner_user: 1, my_role: 'owner', requires_approval: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionUser.email = 'owner@example.com';
  delete mockSessionUser.client_id;
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


test('brand creation relies on server contact defaults', async () => {
  organizationAPI.createWorkspace.mockResolvedValue({ data: { id: 12 } });
  render(<OrganizationTeamPage />);
  await screen.findByRole('heading', { name: 'برندهای Negative Five' });
  fireEvent.change(screen.getByLabelText('نام برند یا واحد'), { target: { value: 'School' } });
  fireEvent.click(screen.getByRole('button', { name: 'افزودن برند' }));
  await waitFor(() => expect(organizationAPI.createWorkspace).toHaveBeenCalledWith('1', {
    company: 'School', requires_approval: true,
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('فضای کاری برند ساخته شد');
});

test('brand field errors are visible and preserve the entered brand', async () => {
  organizationAPI.createWorkspace.mockRejectedValue({ response: { data: { email: ['This field may not be blank.'] } } });
  render(<OrganizationTeamPage />);
  await screen.findByRole('heading', { name: 'برندهای Negative Five' });
  fireEvent.change(screen.getByLabelText('نام برند یا واحد'), { target: { value: 'School' } });
  fireEvent.click(screen.getByRole('button', { name: 'افزودن برند' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ایمیل: This field may not be blank.');
  expect(screen.getByLabelText('نام برند یا واحد')).toHaveValue('School');
});


test('an account without an email can supply a brand contact email', async () => {
  mockSessionUser.email = '';
  organizationAPI.createWorkspace.mockResolvedValue({ data: { id: 12 } });
  render(<OrganizationTeamPage />);
  await screen.findByRole('heading', { name: 'برندهای Negative Five' });
  fireEvent.change(screen.getByLabelText('نام برند یا واحد'), { target: { value: 'School' } });
  fireEvent.change(screen.getByLabelText('ایمیل تماس برند'), { target: { value: 'n5@n5.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'افزودن برند' }));
  await waitFor(() => expect(organizationAPI.createWorkspace).toHaveBeenCalledWith('1', {
    company: 'School', email: 'n5@n5.com', requires_approval: true,
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('فضای کاری برند ساخته شد');
});


test('existing owners can expand the new organization form', async () => {
  render(<OrganizationTeamPage />);
  const toggle = await screen.findByRole('button', { name: 'ساخت مجموعهٔ جدید' });
  expect(screen.queryByLabelText('نام مجموعه')).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(screen.getByLabelText('نام مجموعه')).toBeInTheDocument();
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('active workspace and empty team have clear labels', async () => {
  mockSessionUser.client_id = 10;
  mockSessionUser.email = '';
  render(<OrganizationTeamPage />);
  expect(await screen.findByText('فضای کاری فعال')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'انتخاب فضای کاری' })[0]).toBeDisabled();
  expect(screen.getByText(/مالک مجموعه:/)).toHaveTextContent('شما');
  expect(screen.getByText(/هنوز همکاری به تیم اضافه نشده/)).toBeInTheDocument();
});

test('each brand links directly to its own calendar', async () => {
  render(<OrganizationTeamPage />);
  const links = await screen.findAllByRole('link', { name: 'تقویم محتوا' });
  expect(links.map(link => link.getAttribute('href'))).toEqual(['/u/calendar?workspace=10', '/u/calendar?workspace=11']);
});
