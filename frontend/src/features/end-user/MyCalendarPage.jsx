import { useLanguage } from '@/i18n';
import { useWorkspaces } from '@/hooks/useData';
import useWorkspaceScope from '@/hooks/useWorkspaceScope';
import DataState from '@/components/ui/DataState';

/** One workspace selector in the application shell, not another full-width form. */
export default function MyCalendarPage({ CalendarView }) {
  const { isPersian, t } = useLanguage();
  const { workspaceId } = useWorkspaceScope();
  const { workspaces, loading, error, refetch } = useWorkspaces();
  const selected = workspaces.find(workspace => workspace.id === workspaceId);

  if (loading) return <DataState state="loading" title={t('common.loading', 'Loading…')} />;
  if (error) return <DataState state="error" title={isPersian ? 'دریافت برندها انجام نشد.' : 'Could not load brands.'}
    action={<button type="button" onClick={() => refetch()}>{isPersian ? 'تلاش دوباره' : 'Try again'}</button>} />;

  return selected
    ? <CalendarView key={selected.id} clientId={selected.id} />
    : <DataState state="empty" title={isPersian
      ? 'برای دیدن تقویم، فضای کاری مجاز را از منوی کناری انتخاب کنید.'
      : 'Choose an accessible workspace from the sidebar to view its calendar.'} />;
}
