'use client';
import Protected from '@/core/routes/Protected';
import OrganizationTeamPage from '@/features/end-user/OrganizationTeamPage';
export default function View() {
  return <Protected><OrganizationTeamPage /></Protected>;
}
