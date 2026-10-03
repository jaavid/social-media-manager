'use client';
import Feature from '../../../../../../../../src/pages/EditClientPage.jsx';
import { useAppParams } from '../../../../../../../../src/app/navigation';
export default function View() {
  const params = useAppParams();
  const clientId = params.workspaceId ?? params.clientId;
  return <Feature clientId={clientId} />;
}
