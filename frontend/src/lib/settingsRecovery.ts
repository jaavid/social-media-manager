type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
function check(v: unknown): asserts v { if (!v) throw new Error('Invalid settings response'); }
export function parseAgency(v: unknown) {
  check(object(v) && typeof v.connected === 'boolean');
  if (!v.connected) return { connected: false };
  check(typeof v.agency_name === 'string' && typeof v.agency_email === 'string' && (v.agency_since === null || (typeof v.agency_since === 'string' && Number.isFinite(Date.parse(v.agency_since)))));
  return { connected: true, agency_name: v.agency_name, agency_email: v.agency_email, agency_since: v.agency_since };
}
export function parseDisconnect(v: unknown) {
  // Browser middleware replaces the issued JWTs with an opaque session acknowledgment.
  check(object(v) && v.detail === 'Successfully disconnected from agency.' && v.session === true);
}
export function parsePreferences(v: unknown) {
  check(object(v) && Array.isArray(v.events) && Array.isArray(v.channels) && Array.isArray(v.matrix));
  const descriptor = (r: unknown) => object(r) && typeof r.id === 'string' && !!r.id && typeof r.label === 'string';
  check(v.events.every(descriptor) && v.channels.every(descriptor));
  const events = v.events as { id: string; label: string }[], channels = v.channels as { id: string; label: string }[];
  check(new Set(events.map(e => e.id)).size === events.length && new Set(channels.map(e => e.id)).size === channels.length && v.matrix.length === events.length);
  const matrix = v.matrix.map((r: unknown) => {
    check(object(r) && typeof r.event_type === 'string' && events.some(e => e.id === r.event_type) && channels.every(c => typeof r[c.id] === 'boolean'));
    return Object.fromEntries([['event_type', r.event_type], ...channels.map(c => [c.id, r[c.id]])]);
  });
  check(new Set(matrix.map(r => r.event_type)).size === events.length);
  return { events: events.map(e => ({ id: e.id, label: e.label })), channels: channels.map(c => ({ id: c.id, label: c.label })), matrix };
}
export function parsePreferenceWrite(v: unknown, count: number) { check(object(v) && v.updated === count); }
export function parseMarked(v: unknown) { check(object(v) && v.status === 'ok'); }
export function parseAlerts(v: unknown) {
  const rows = Array.isArray(v) ? v : object(v) && Array.isArray(v.results) ? v.results : null;
  check(rows && rows.every((r: unknown) => object(r) && Number.isSafeInteger(r.id) && Number(r.id) > 0 && typeof r.message === 'string' && typeof r.alert_type === 'string' && typeof r.is_read === 'boolean' && typeof r.created_at === 'string' && Number.isFinite(Date.parse(r.created_at))));
  check(new Set(rows.map((r: Row) => r.id)).size === rows.length);
  return rows.map((r: Row) => ({ id: r.id, message: r.message, alert_type: r.alert_type, is_read: r.is_read, created_at: r.created_at, client_name: typeof r.client_name === 'string' ? r.client_name : '', platform: typeof r.platform === 'string' ? r.platform : '' }));
}
export function parseNotifications(v: unknown) {
  check(Array.isArray(v) && v.every(r => object(r) && Number.isSafeInteger(r.id) && Number(r.id) > 0 && typeof r.notif_type === 'string' && typeof r.title === 'string' && typeof r.body === 'string' && typeof r.is_read === 'boolean' && typeof r.created_at === 'string' && Number.isFinite(Date.parse(r.created_at)) && object(r.data)));
  check(new Set(v.map(r => r.id)).size === v.length);
  return v.map(r => ({ id: r.id, notif_type: r.notif_type, title: r.title, body: r.body, is_read: r.is_read, created_at: r.created_at, data: r.data }));
}
const textFields = ['name', 'company', 'email', 'phone', 'whatsapp_number', 'website', 'gmb_url', 'business_category', 'brand_description', 'usp', 'brand_tone', 'target_audience', 'gender', 'business_location'];
export function parseBusiness(v: unknown, workspace: unknown) {
  check(object(v) && Number(v.id) === Number(workspace) && textFields.every(k => typeof v[k] === 'string' || v[k] === null) && ['business_subcategories', 'target_locations', 'competitors'].every(k => Array.isArray(v[k])) && object(v.brand_assets) && (v.profile_image === null || typeof v.profile_image === 'string'));
  check(['business_subcategories', 'target_locations'].every(k => (v[k] as unknown[]).every(s => typeof s === 'string')));
  check((v.competitors as unknown[]).every(c => object(c) && Number.isSafeInteger(c.id) && typeof c.name === 'string' && (Array.isArray(c.social_links) || object(c.social_links))));
  return { id: v.id, ...Object.fromEntries(textFields.map(k => [k, v[k] ?? ''])), business_subcategories: v.business_subcategories, target_locations: v.target_locations, competitors: v.competitors, brand_assets: v.brand_assets, profile_image: v.profile_image };
}
