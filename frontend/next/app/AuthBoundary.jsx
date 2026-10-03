'use client';
import Protected from '../../src/app/routes/Protected';
import AppShell from '../../src/app/layout/AppShell';
// API authorization remains authoritative. The current JWT contract is browser
// storage, so the server must not invent a cookie session or infer a role.
export default function AuthBoundary({ children, roles, shell }) {
  return <Protected roles={roles}>
    {shell ? <AppShell isAdmin={shell === 'admin'}>{children}</AppShell> : children}
  </Protected>;
}
