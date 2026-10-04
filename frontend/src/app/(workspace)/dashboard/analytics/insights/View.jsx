'use client';
import Feature from '../../../../../features/ai/AIInsightsPage.jsx';
import { useSession } from '../../../../../core/session';
export default function View() {
  const { user } = useSession();
  const clientId = user?.workspace_id ?? user?.client_id ?? null;
  return <Feature clientId={clientId} />;
}
