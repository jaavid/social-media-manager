import { AppLink as Link, useAppLocation, useAppNavigate } from '../../core/navigation';
import { useWorkspaces } from '../../hooks/useData';
import useWorkspaceScope from '../../hooks/useWorkspaceScope';
import { useLanguage } from '../../i18n';
import NativeSelect from '../ui/NativeSelect';

// Names come only from server-listed, accessible workspaces. A user/account name
// or an organization role is not a workspace identity or a content permission.
export default function WorkspaceContext({ basePath = '/u', compact = false }) {
  const { workspaceId, selectWorkspace } = useWorkspaceScope();
  const { workspaces, error } = useWorkspaces();
  const { t } = useLanguage();
  const location = useAppLocation();
  const navigate = useAppNavigate();
  const selected = !error && workspaces.find(row => row.id === workspaceId);
  const endUser = basePath === '/u';
  return <section className={compact ? 'min-w-0' : 'grid min-w-0 gap-2 border-b border-border px-3 py-3'} aria-label={t('nav.workspace')} data-workspace-context>
    <span className={compact ? 'sr-only' : 'text-xs text-muted-foreground'}>{t('nav.workspace')}</span>
    <strong className={compact ? 'sr-only' : 'break-words text-sm'}><bdi>{selected ? selected.display_name || selected.company || selected.name || t('nav.unknownWorkspace')
      : t(workspaceId ? 'nav.unknownWorkspace' : 'nav.noWorkspace')}</bdi></strong>
    {endUser ? <Link to="/u/organizations" className="text-xs underline">{t('nav.chooseWorkspace')}</Link>
      : <NativeSelect aria-label={t('nav.chooseWorkspace')} value={selected ? String(workspaceId) : ''}
        onChange={event => {
          const id = Number(event.target.value);
          if (!workspaces.some(row => row.id === id)) return;
          const match = location.pathname.match(/^\/admin\/(workspace|client)\/[^/]+/);
          if (match) {
            const search = new URLSearchParams(location.search);
            if (search.has('workspace')) search.set('workspace', String(id));
            navigate({ pathname: location.pathname.replace(match[0], `/admin/workspace/${id}`),
              search: search.size ? `?${search}` : '', hash: location.hash });
          } else if (basePath === '/admin' && location.pathname.startsWith('/admin/analytics')) {
            // The staff analytics shell reads workspace from the URL. A
            // path-local ephemeral selection can disappear after Next updates
            // the route and leave the header unselected while stale scoped
            // counts remain. Make analytics workspace selection shareable.
            const search = new URLSearchParams(location.search);
            search.set('workspace', String(id));
            navigate({ pathname: location.pathname, search: `?${search}`, hash: location.hash });
          } else {
            selectWorkspace(id);
          }
        }}>
        <option value="" disabled>{t('nav.chooseWorkspace')}</option>
        {!error && workspaces.map(row => <option key={row.id} value={String(row.id)}>{row.display_name || row.company || row.name || t('nav.unknownWorkspace')}</option>)}
      </NativeSelect>}
    {basePath === '/admin' && !compact && <Link to="/admin/workspaces" className="text-xs underline">{t('common.allWorkspaces')}</Link>}
    
  </section>;
}
