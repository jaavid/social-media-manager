'use client';
import Protected from '../../src/app/routes/Protected';
import AppShell from '../../src/app/layout/AppShell';
import EndUserShell from '../../src/pages/end-user/EndUserShell';
export function Guard({ children, roles, accountTypes }) {
  return <Protected roles={roles} accountTypes={accountTypes}>{children}</Protected>;
}
export function Shell({ children, admin = false }) { return <AppShell isAdmin={admin}>{children}</AppShell>; }
export function EndUserLayout({ children }) { return <EndUserShell>{children}</EndUserShell>; }
