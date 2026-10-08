const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
export function parseSuggestion(value: unknown, workspace: number, account: number) {
  if (!object(value) || !id(value.id) || value.client !== workspace || value.account !== account
      || typeof value.content !== 'string' || !object(value.media) || !object(value.proposal)
      || typeof value.state !== 'string' || !value.state || value.state.length > 30
      || typeof value.provider_state !== 'string' || !value.provider_state || value.provider_state.length > 30
      || (value.draft !== null && !id(value.draft))
      || typeof value.updated_at !== 'string' || !Number.isFinite(Date.parse(value.updated_at))
      || (value.account_name !== undefined && typeof value.account_name !== 'string')
      || (value.sender_name !== undefined && typeof value.sender_name !== 'string')) throw new Error('Invalid suggestion response');
  const price = value.proposal.price;
  if (price !== undefined && price !== null && (!object(price)
      || !['string', 'number'].includes(typeof price.amount)
      || (typeof price.amount === 'number' && !Number.isFinite(price.amount))
      || typeof price.currency !== 'string')) throw new Error('Invalid suggestion response');
  return value;
}
export function parseSuggestions(value: unknown, workspace: number, account: number) {
  const rows = object(value) && 'results' in value ? value.results : value;
  if (!Array.isArray(rows)) throw new Error('Invalid suggestions response');
  const parsed = rows.map(row => parseSuggestion(row, workspace, account));
  if (new Set(parsed.map(row => row.id)).size !== parsed.length) throw new Error('Invalid suggestions response');
  return parsed;
}
export function parseDecision(value: unknown, status: number, decision: string, workspace: number, account: number, suggestion: number) {
  if (status === 202 && object(value) && value.requires_approval === true && id(value.approval_id)
      && value.action_type === 'telegram_suggestion' && typeof value.expires_at === 'string' && Number.isFinite(Date.parse(value.expires_at))) return { pending: true as const };
  if (status !== 200) throw new Error('Invalid decision acknowledgment');
  const row = parseSuggestion(value, workspace, account);
  const expected: Record<string, string> = { under_review: 'under_review', accept_as_draft: 'accepted_as_draft', approve: 'approved', decline: 'declined' };
  if (row.id !== suggestion || row.state !== expected[decision]
      || (decision === 'accept_as_draft' && !id(row.draft))
      || (['approve', 'decline'].includes(decision) && row.provider_state !== row.state)) throw new Error('Invalid decision acknowledgment');
  return { pending: false as const, row };
}
