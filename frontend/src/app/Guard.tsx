'use client';
import type { PropsWithChildren } from 'react';
import Protected from '../core/routes/Protected';
import AppShell from '../core/layout/AppShell';
import EndUserShell from '../features/end-user/EndUserShell';
export function Guard({ children, roles, accountTypes }: PropsWithChildren<{ roles?: string[]; accountTypes?: string[] }>) {
  return <Protected roles={roles} accountTypes={accountTypes}>{children}</Protected>;
}
export function Shell({ children, admin = false }: PropsWithChildren<{ admin?: boolean }>) { return <AppShell isAdmin={admin}>{children}</AppShell>; }
export function EndUserLayout({ children }: PropsWithChildren) { return <EndUserShell>{children}</EndUserShell>; }
