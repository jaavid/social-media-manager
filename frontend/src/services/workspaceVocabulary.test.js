import { workspaceRequest } from './workspaceVocabulary';
import { api } from '@/services/http/client';
import { workspacesAPI, clientsAPI } from '@/services/domains/accounts';
import { managementAPI } from '@/services/domains/marketplace';
import { adminAPI } from '@/services/domains/reporting';

test('workspace requests preserve opaque data and reject conflicting tenant IDs', () => {
  const original = { client_id: 1, metadata: { client_id: 9 }, add: [{ client_id: 2 }] };
  expect(workspaceRequest(original)).toEqual({ workspace_id: 1, metadata: { client_id: 9 }, add: [{ workspace_id: 2 }] });
  expect(original.client_id).toBe(1);
  expect(workspaceRequest({ workspace_id: 1 })).toEqual({ workspace_id: 1 });
  expect(() => workspaceRequest({ client_id: 1, workspace_id: 2 })).toThrow('Conflicting');
  const form = new FormData();
  form.append('client', '1');
  form.append('logo', new Blob(['image']), 'logo.png');
  const mapped = workspaceRequest(form);
  expect(mapped.get('workspace')).toBe('1');
  expect(mapped.has('client')).toBe(false);
  expect(mapped.get('logo').name).toBe('logo.png');
  expect(form.get('client')).toBe('1');
  form.append('workspace', '2');
  expect(() => workspaceRequest(form)).toThrow('Conflicting');
});

test('canonical SDK routes and old exports share compatibility behavior', async () => {
  const seen = [];
  api.defaults.adapter = async config => {
    seen.push(config);
    return { data: {}, status: 200, config };
  };
  expect(clientsAPI).toBe(workspacesAPI);
  expect(adminAPI.createClient).toBe(adminAPI.createWorkspace);
  expect(managementAPI.listClients).toBe(managementAPI.listWorkspaces);
  await workspacesAPI.summary(7, { client_id: 7 });
  await workspacesAPI.create({ company: 'One', name: 'One' });
  await managementAPI.listWorkspaces();
  expect(seen.map(row => row.url)).toEqual(['/workspaces/7/summary/', '/workspaces/', '/management/workspaces/']);
  expect(seen[0].params).toEqual({ workspace_id: 7 });
});
