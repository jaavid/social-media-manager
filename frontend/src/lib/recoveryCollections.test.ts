import { parseSessions, parseSyncLogs, parseRevocation } from './recoveryCollections';
const log = {
  id: 1,
  platform: 'fixture',
  status: 'success',
  client_name: 'Workspace',
  records_synced: 0,
  started_at: '2026-10-07T10:00:00Z',
  duration_seconds: null,
  error_message: 'private provider token',
};
const session = {
  id: 1,
  browser: '',
  os: '',
  device: '',
  ip: null,
  last_used_at: log.started_at,
  is_active: true,
};
test('real empty and zero are valid; raw provider diagnostics are excluded', () => {
  expect(parseSyncLogs([])).toEqual([]);
  expect(parseSyncLogs({ results: [log] })[0].records_synced).toBe(0);
  expect(parseSyncLogs([log])[0]).not.toHaveProperty('error_message');
  expect(parseSessions({ sessions: [], count: 0 })).toEqual([]);
  expect(parseSessions({ sessions: [session], count: 1 })[0]).toEqual(session);
});
test('missing, malformed and duplicate records fail closed', () => {
  for (const wire of [
    null,
    {},
    { results: {} },
    [null],
    [log, log],
    [{ ...log, started_at: 'bad' }],
    [{ ...log, duration_seconds: Infinity }],
    [{ ...log, status: 'invented' }],
  ])
    expect(() => parseSyncLogs(wire)).toThrow();
  for (const wire of [
    null,
    {},
    { sessions: [], count: 1 },
    { sessions: [session, session], count: 2 },
    { sessions: [{ ...session, is_active: 'true' }], count: 1 },
  ])
    expect(() => parseSessions(wire)).toThrow();
});
test('HTTP success is insufficient proof of revocation', () => {
  for (const wire of [null, {}, { ok: false }, { ok: true, revoked: -1 }])
    expect(() => parseRevocation(wire, true)).toThrow();
  expect(() => parseRevocation({ ok: true }, false)).not.toThrow();
  expect(() => parseRevocation({ ok: true, revoked: 0 }, true)).not.toThrow();
});
