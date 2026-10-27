import { useQuery } from '@tanstack/react-query';
import { useSession } from '../core/session';
import useWorkspaceScope from './useWorkspaceScope';
import { connectionsAPI } from '../services/domains/connections';

// Legacy session grants alone cannot prove access to another workspace/account.
// Missing metadata is unknown, never an inferred grant or a replacement for API authorization.
export function navigationPermission(code, can, accounts) {
  if (!can(code)) return false;
  const actions = {
    'composer.view': ['view_posts'],
    'dashboard.posts_table': ['view_posts'],
    'inbox.view': ['view_inbox'],
    'analytics.view': ['view_analytics'],
    'reports.view': ['view_analytics', 'generate_reports'],
  }[code];
  return !actions || accounts.some(account => actions.every(action => account.permissions?.[action] === true));
}
export default function useNavigationAccess() {
  const { can, user, status } = useSession();
  const scope = useWorkspaceScope();
  const query = useQuery({
    queryKey: ['navigation.access', scope.key, user?.permissions],
    enabled: status === 'authenticated' && scope.workspaceId !== null,
    queryFn: ({ signal }) => connectionsAPI.get(scope.workspaceId, signal),
    retry: false,
    gcTime: 0,
  });
  const accounts = !query.isError && query.data?.workspace_id === scope.workspaceId
    ? query.data.providers.flatMap(provider => provider.accounts) : [];
  return code => navigationPermission(code, can, accounts);
}
