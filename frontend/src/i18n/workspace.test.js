import { translate, translateRaw } from './index';

test('English and Persian product copy use Workspace, with legacy copy aliases', () => {
  expect(translateRaw('Workspaces', 'fa')).toBe('فضاهای کاری');
  expect(translateRaw('Workspace', 'fa')).toBe('فضای کاری');
  expect(translateRaw('Clients', 'en')).toBe('Workspaces');
  expect(translateRaw('Clients', 'fa')).toBe('فضاهای کاری');
  expect(translate('common.allWorkspaces', 'fa')).toBe('همه فضاهای کاری');
  expect(translate('common.allClients', 'fa')).toBe('همه فضاهای کاری');
  expect(translate('accounts.workspacePreparing', 'en')).toContain('Your workspace is');
  // Customer names and provider application terminology are not tenant aliases.
  expect(translateRaw('OAuth client secret', 'en')).toBe('OAuth client secret');
});
