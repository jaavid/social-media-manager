/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { cn } from "../../lib/utils";

import { useState } from "react";

import WorkspaceTeamPolicy from "../../components/WorkspaceTeamPolicy";

import { Users, UserCog, Shield } from "lucide-react";

import PageHeader from "../../components/layout/PageHeader";

import SegmentedTabs from "../../components/ui/SegmentedTabs";

import { StaffTab } from './StaffTab';

import { ClientsTab } from './ClientsTab';

import { RoleDefaultsTab } from './RoleDefaultsTab';

const TABS = [
  {
    id: 'team-policy',
    label: 'Workspace Team',
    icon: Users,
  },
  {
    id: 'staff',
    label: 'Staff Members',
    icon: UserCog,
  },
  {
    id: 'clients',
    label: 'User Access',
    icon: Users,
  },
  {
    id: 'defaults',
    label: 'Role Defaults',
    icon: Shield,
  },
];

export default function ManagementPage() {
  const [activeTab, setTab] = useState('staff');
  return (
    <div className="app-page app-page--md">
      <PageHeader
        title="Access Management"
        subtitle="Manage staff permissions, user access, and role defaults"
      />

      <SegmentedTabs
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          icon: <t.icon size={15} />,
        }))}
        active={activeTab}
        onChange={setTab}
        compact
        className={cn('[margin-bottom:24px]')}
      />

      <div className={cn('[padding-top:8px]')}>
        {activeTab === 'team-policy' && <WorkspaceTeamPolicy />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'clients' && <ClientsTab />}
        {activeTab === 'defaults' && <RoleDefaultsTab />}
      </div>
    </div>
  );
}
