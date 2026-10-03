'use client';
import Feature from '../../../../../../src/pages/ClientDashboard.jsx';
import { useSession } from '../../../../../../src/app/session';
export default function View() {
  const { user } = useSession();
  const clientId = user?.workspace_id ?? user?.client_id ?? null;
  return <Feature clientId={clientId} />;
}
