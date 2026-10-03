// Keep the ingress allowlist in docker/next-routes.conf aligned with this list.
export const migratedRoutes = [
  '/privacy', '/terms', '/login', '/pending',
  '/admin/account-settings', '/dashboard/account-settings',
];
export function isMigratedRoute(pathname) {
  return migratedRoutes.includes(pathname.replace(/\/+$/, '') || '/');
}
