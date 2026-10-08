import { parseBusiness } from './settingsRecovery';
type Row = Record<string, unknown>;
function check(v: unknown): asserts v { if (!v) throw new Error('Invalid onboarding response'); }
export function parseOnboarding(v: unknown, workspace: unknown) {
  const row = v as Row;
  const profile = parseBusiness(v, workspace);
  check(typeof row.onboarding_complete === 'boolean' && Array.isArray(row.product_images) && row.product_images.every(url => typeof url === 'string'));
  return { ...profile, onboarding_complete: row.onboarding_complete, product_images: row.product_images };
}
export function parseOnboardingWrite(v: unknown, workspace: unknown, draft: Row, complete = false) {
  const row = v as Row;
  check(row && Number.isSafeInteger(row.id) && Number(row.id) > 0);
  const result = parseOnboarding(v, workspace || row.id);
  for (const [key, value] of Object.entries(draft)) {
    if (['competitors','profile_image'].includes(key)) continue;
    check(JSON.stringify((result as unknown as Row)[key]) === JSON.stringify(value));
  }
  if (draft.profile_image) check(typeof result.profile_image === 'string' && result.profile_image.length > 0);
  check(!complete || result.onboarding_complete === true);
  return result;
}
