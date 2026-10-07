import {
  parseMfaStatus,
  parseMfaSetup,
  parseBackupCodes,
  parseOk,
  parseExport,
  parseExports,
  parseConsents,
  parseConsentWrite,
  parseProcessing,
  parseProcessingWrite,
  parseDeletion,
  parseDeletionStatus,
  parseImmediateDeletion,
} from './accountRecovery';
const date = '2026-10-07T10:00:00Z';
const codes = Array.from({ length: 10 }, (_, i) => String(i).padStart(10, '0'));
const exported = {
  id: 1,
  status: 'queued',
  requested_at: date,
  completed_at: null,
  expires_at: null,
  size_bytes: 0,
  download_url: null,
  error_message: 'private',
};
const deletion = {
  id: 1,
  status: 'queued',
  requested_at: date,
  grace_until: date,
  cancelled_at: null,
  processed_at: null,
  reason: '',
};
test('MFA wire shapes fail closed and secret is excluded from status', () => {
  expect(() => parseMfaStatus({ enabled: false })).toThrow();
  expect(
    parseMfaStatus({
      enabled: false,
      pending: true,
      backup_codes_remaining: 0,
      last_used_at: null,
      secret: 'private',
    }),
  ).not.toHaveProperty('secret');
  expect(() =>
    parseMfaSetup({ secret: 'private', qr_data_uri: 'https://external.test/secret' }),
  ).toThrow();
  expect(() => parseBackupCodes({ ok: true, backup_codes: [] })).toThrow();
  expect(() => parseBackupCodes({ ok: true, backup_codes: Array(10).fill(codes[0]) })).toThrow();
  expect(() => parseBackupCodes({ ok: true, backup_codes: codes, count: 9 }, true)).toThrow();
  expect(parseBackupCodes({ ok: true, backup_codes: codes })).toEqual(codes);
  expect(() => parseOk({ ok: false })).toThrow();
});
test('privacy readers distinguish empty from missing, and strip diagnostics', () => {
  for (const parse of [parseExports, parseConsents, parseProcessing, parseDeletionStatus])
    expect(() => parse({})).toThrow();
  expect(parseExports({ requests: [] })).toEqual([]);
  expect(parseDeletionStatus({ request: null })).toBeNull();
  expect(parseExport(exported)).not.toHaveProperty('error_message');
  expect(() => parseExport({ ...exported, download_url: 'https://attacker.test/' })).toThrow();
  expect(() => parseExports({ requests: [exported, exported] })).toThrow();
  expect(() => parseConsents({ consents: { unknown: true }, available: [] })).toThrow();
  expect(() =>
    parseProcessing({ workspaces: [{ id: 1, name: 'A', is_processing_paused: 'false' }] }),
  ).toThrow();
});
test('write acknowledgments must match operation and actual state', () => {
  expect(() =>
    parseConsentWrite(
      { ok: true, consent_type: 'wrong', given: true, recorded_at: date },
      'data_processing',
      true,
    ),
  ).toThrow();
  expect(() =>
    parseProcessingWrite({ ok: true, workspaces_affected: 0, is_processing_paused: true }, true),
  ).toThrow();
  expect(() => parseDeletion({ ...deletion, status: 'cancelled' })).toThrow();
  expect(parseDeletion(deletion).status).toBe('queued');
  expect(() => parseImmediateDeletion({ ok: true })).toThrow();
  parseImmediateDeletion({ detail: 'Your account has been permanently deleted.' });
});
