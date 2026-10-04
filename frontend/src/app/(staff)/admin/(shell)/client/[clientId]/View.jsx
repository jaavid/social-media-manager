'use client';
import Feature from '../../../../../../features/ClientDashboard.jsx';
import { useAppParams } from '../../../../../../core/navigation';
export default function View() {
  const params = useAppParams();
  const clientId = params.workspaceId ?? params.clientId;
  return <Feature clientId={clientId} />;
}
