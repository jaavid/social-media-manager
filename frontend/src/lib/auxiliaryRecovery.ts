type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
function check(v: unknown): asserts v { if (!v) throw new Error('Invalid auxiliary response'); }
const date = (v: unknown) => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
export function parseOAuthStatus(v: unknown) {
  // This legacy endpoint always emits these five rows; this is a wire contract,
  // not a presentation/capability registry. Additional backend rows are retained.
  check(object(v) && ['facebook', 'instagram', 'youtube', 'linkedin', 'google_my_business'].every(key => object(v[key])));
  return Object.fromEntries(Object.entries(v).map(([key, item]) => {
    check(object(item) && ['active', 'expired', 'not_connected'].includes(String(item.status)) && date(item.last_successful_sync) && Array.isArray(item.accounts));
    if (item.status !== 'not_connected') check(typeof item.connected_at === 'string' && date(item.connected_at) && date(item.expires_at) && typeof item.account_name === 'string');
    check(item.accounts.every((a: unknown) => object(a) && Number.isSafeInteger(a.id) && Number(a.id) > 0 && typeof a.external_id === 'string' && typeof a.account_name === 'string' && typeof a.status === 'string' && typeof a.is_active === 'boolean'));
    return [key, { status: item.status, last_successful_sync: item.last_successful_sync, accounts: item.accounts.map((a: Row) => ({ id: a.id, external_id: a.external_id, account_name: a.account_name, status: a.status, is_active: a.is_active })) }];
  }));
}
export function parseLookups(v: unknown) {
  check(object(v));
  return Object.fromEntries(Object.entries(v).map(([key, list]) => {
    check(Array.isArray(list) && list.every(item => object(item) && typeof item.key === 'string' && typeof item.label === 'string' && typeof item.value === 'string' && typeof item.parent_key === 'string' && Number.isSafeInteger(item.sort_order) && Object.prototype.hasOwnProperty.call(item, 'metadata')));
    check(new Set(list.map(item => item.key)).size === list.length);
    return [key, list.map(item => ({ key: item.key, label: item.label, value: item.value, parent_key: item.parent_key, sort_order: item.sort_order, metadata: item.metadata }))];
  }));
}
