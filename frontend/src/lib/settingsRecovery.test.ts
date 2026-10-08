import { parseAgency, parseDisconnect, parsePreferences, parsePreferenceWrite, parseAlerts, parseNotifications, parseMarked, parseBusiness } from './settingsRecovery';
const stamp = '2026-10-07T10:00:00Z';
const preferences = { events: [{ id: 'post_published', label: 'Published' }], channels: [{ id: 'email', label: 'Email' }], matrix: [{ event_type: 'post_published', email: true }] };
test('agency read cannot default to disconnected; browser response must acknowledge session', () => {
  for (const v of [{}, null, { connected: true }, { connected: 'false' }]) expect(() => parseAgency(v)).toThrow();
  expect(parseAgency({ connected: false })).toEqual({ connected: false });
  for (const v of [{}, { detail: 'Successfully disconnected from agency.' }, { session: true }]) expect(() => parseDisconnect(v)).toThrow();
  expect(() => parseDisconnect({ detail: 'Successfully disconnected from agency.', session: true })).not.toThrow();
});
test('preferences require the complete event/channel boolean matrix and exact write count', () => {
  expect(parsePreferences(preferences)).toEqual(preferences);
  for (const v of [{}, { ...preferences, matrix: [] }, { ...preferences, matrix: [{ event_type: 'other', email: true }] }, { ...preferences, matrix: [{ event_type: 'post_published', email: null }] }]) expect(() => parsePreferences(v)).toThrow();
  expect(() => parsePreferenceWrite({ updated: 0 }, 1)).toThrow();
});
test('alert and notification failures cannot be empty or unchecked mutation success', () => {
  for (const v of [{}, null, { results: [{}] }]) expect(() => parseAlerts(v)).toThrow();
  expect(parseAlerts({ results: [] })).toEqual([]);
  expect(() => parseMarked({})).toThrow();
  expect(() => parseMarked({ status: 'ok' })).not.toThrow();
  expect(() => parseNotifications({})).toThrow();
  expect(() => parseNotifications([{ id: 1, title: 'fixture', body: '', data: {}, notif_type: 'system', is_read: false, created_at: stamp }])).not.toThrow();
});
test('business profile must match captured workspace and editable field shapes', () => {
  expect(() => parseBusiness({ id: 7, name: 'fixture' }, 7)).toThrow();
  expect(() => parseBusiness({ id: 8 }, 7)).toThrow();
});
