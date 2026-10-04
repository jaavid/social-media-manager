import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkspaceTeamPolicy from './WorkspaceTeamPolicy';
import api, { managementAPI } from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
  managementAPI: { listWorkspaces: jest.fn() },
}));

const team = {
  actions: { publish_posts: 'Publish Posts' }, accounts: [{ id: 3, label: 'Facebook page' }],
  members: [{ user_id: 2, name: 'Editor', effective: { publish_posts: { allowed: true, requires_approval: true } } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  managementAPI.listWorkspaces.mockResolvedValue({ data: [{ id: 1, company: 'Team' }] });
  api.put.mockResolvedValue({ data: {} });
  api.get.mockImplementation(path => Promise.resolve({ data:
    path.includes('role-presets') ? [{ key: 'editor', label: 'Editor', permissions: { publish_posts: true }, approval_defaults: { publish_posts: true } }]
      : path.endsWith('team-policy/') ? team
        : { preset: 'editor', permissions: {}, approval_overrides: {}, effective: team.members[0].effective },
  }));
});

async function selectMember() {
  render(<WorkspaceTeamPolicy />);
  await screen.findByRole('option', { name: 'Team' });
  fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: '1' } });
  await screen.findByRole('option', { name: 'Editor' });
  fireEvent.change(screen.getByLabelText('Member'), { target: { value: '2' } });
  await screen.findByRole('button', { name: 'Save policy' });
}

test('shows saved approval defaults and submits explicit boolean exceptions', async () => {
  await selectMember();
  expect(screen.getByText('Allowed with review')).toBeInTheDocument();
  expect(screen.getByText('Allowed · Review required')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Permission: Publish Posts'), { target: { value: 'false' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/management/workspaces/1/team-policy/2/', {
    preset: 'editor', permissions: { publish_posts: false }, approval_overrides: {},
  }));
});

test('account selection uses the scoped endpoint and inherited overrides remain absent', async () => {
  await selectMember();
  fireEvent.change(screen.getByLabelText('Scope'), { target: { value: '3' } });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/management/workspaces/1/accounts/3/policy/2/'));
  await screen.findByRole('button', { name: 'Save policy' });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/management/workspaces/1/accounts/3/policy/2/', {
    preset: 'editor', permissions: {}, approval_overrides: {},
  }));
});

test('failed saves show an error', async () => {
  api.put.mockRejectedValueOnce(new Error('denied'));
  await selectMember();
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save policy.');
});
