import { redirect } from 'next/navigation';

/** Preserve the validated workspace selector across the canonical analytics redirect. */
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const value = params?.workspace;
  // Only numeric workspace IDs are accepted by the authenticated workspace
  // resolver; do not forward arbitrary or malformed query parameters.
  const workspace = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? value : null;
  redirect(workspace
    ? `/admin/analytics/analytics?workspace=${encodeURIComponent(workspace)}`
    : '/admin/analytics/analytics');
}
