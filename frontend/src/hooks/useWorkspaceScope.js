import { useQuery } from '@tanstack/react-query';
import { useAppParams, useAppLocation, useAppSearchParams } from '../core/navigation';
import { useSession } from '../core/session';
import { useAppStore } from '../stores/appStore';
import { workspacesAPI } from '../services/domains/accounts';

export function normalizeWorkspaceId(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// null means unresolved/no workspace, never all workspaces. Access remains
// enforced by the backend; non-default choices require a server-listed ID.
export function resolveWorkspace({ user, status, route, selection, owner, allowed = [] }) {
  if (status !== 'authenticated' || !user) return null;
  const fallback = normalizeWorkspaceId(user.workspace_id ?? user.client_id);
  const valid = id => id !== null && (id === fallback || allowed.some(row => normalizeWorkspaceId(row.id) === id));
  if (route !== undefined) {
    const id = normalizeWorkspaceId(route);
    return valid(id) ? id : null;
  }
  const id = normalizeWorkspaceId(selection);
  if (owner === user.id && selection !== undefined) return valid(id) ? id : null;
  return fallback;
}

export default function useWorkspaceScope() {
  const { user, status } = useSession();
  const params = useAppParams();
  const { pathname } = useAppLocation();
  const selected = useAppStore(s => s.workspaceSelection);
  const [search] = useAppSearchParams();
  const pathWorkspace = pathname.match(/^\/admin\/(?:workspace|client)\/([^/]+)/)?.[1];
  const route = params.workspaceId ?? params.clientId ?? pathWorkspace ?? (search.has('workspace') ? search.get('workspace') : undefined);
  const candidate = route ?? (selected?.owner === user?.id && selected?.path === pathname ? selected.id : undefined);
  const fallback = normalizeWorkspaceId(user?.workspace_id ?? user?.client_id);
  const access = useQuery({
    queryKey: ['workspace.scope.access', user?.id, normalizeWorkspaceId(candidate)],
    enabled: status === 'authenticated' && normalizeWorkspaceId(candidate) !== null && normalizeWorkspaceId(candidate) !== fallback,
    queryFn: async ({ signal }) => {
      const response = await workspacesAPI.get(normalizeWorkspaceId(candidate), signal);
      if (normalizeWorkspaceId(response.data?.id) !== normalizeWorkspaceId(candidate)) throw new Error('Invalid workspace response');
      return [response.data];
    },
    retry: false,
  });
  const workspaceId = resolveWorkspace({ user, status, route,
    selection: selected?.owner === user?.id && selected?.path === pathname ? selected.id : undefined,
    owner: selected?.owner, path: pathname, allowed: access.isError ? [] : access.data });
  return { workspaceId, key: JSON.stringify([status, user?.id, workspaceId]), user, pathname };
}

export function useScopedBadgeCount(key) {
  const scope = useWorkspaceScope();
  return useAppStore(s => s.badgeScope === scope.key && scope.workspaceId !== null ? s.badgeCounts[key] || 0 : 0);
}
