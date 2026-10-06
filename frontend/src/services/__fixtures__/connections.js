import registry from './platformExample.json';
export const connectionAccount = (id = 10, state = 'ready', sync = 'fresh') => ({
  id, name: id === 10 ? 'First account' : 'Second account', external_id: `destination-${id}`,
  identity: { id: `identity-${id}`, name: id === 10 ? 'First account' : 'Second account' },
  destination: { id: `destination-${id}`, kind: 'profile' },
  health: { state, ready: state === 'ready', code: '' },
  sync: { state: sync, last_success_at: '2026-10-01T10:00:00Z', last_failure_at: sync === 'failure' ? '2026-10-02T10:00:00Z' : null,
    last_attempt_at: '2026-10-02T10:00:00Z', stale_after_seconds: 86400 },
  expires_at: '2026-11-01T10:00:00Z', connected_at: '2026-09-01T10:00:00Z',
  permissions: { reconnect: true, disconnect: true },
});
export function connectionFixture(workspaceId = 7) {
  const metadata = JSON.parse(JSON.stringify(registry));
  return { version: 1, workspace_id: workspaceId, categories: metadata.categories,
    providers: metadata.platforms.map(p => ({ ...p, readiness: null, permissions: { connect: true }, accounts: [connectionAccount(), connectionAccount(11, 'expired', 'failure')] })) };
}
