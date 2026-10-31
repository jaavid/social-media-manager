'use client';
import Feature from "@/features/CalendarPage.jsx";
import useWorkspaceScope from "@/hooks/useWorkspaceScope";
export default function View() {
  const { workspaceId: clientId } = useWorkspaceScope();
  return <Feature clientId={clientId} />;
}
