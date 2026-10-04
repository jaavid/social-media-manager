'use client';
import Protected from '../core/routes/Protected';
import AppShell from '../core/layout/AppShell';
import EndUserShell from '../features/end-user/EndUserShell';
export function Guard({ children, roles, accountTypes }) {
  return <Protected roles={roles} accountTypes={accountTypes}>{children}</Protected>;
}
export function Shell({ children, admin = false }) { return <AppShell isAdmin={admin}>{children}</AppShell>; }
export function EndUserLayout({ children }) { return <EndUserShell>{children}</EndUserShell>; }
