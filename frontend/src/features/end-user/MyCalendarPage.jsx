import { useLanguage } from '@/i18n';
import { useWorkspaces } from '@/hooks/useData';
import useWorkspaceScope from '@/hooks/useWorkspaceScope';
import NativeSelect from '@/components/ui/NativeSelect';
import DataState from '@/components/ui/DataState';

export default function MyCalendarPage({ CalendarView }) {
  const { isPersian, t } = useLanguage();
  const { workspaceId, selectWorkspace } = useWorkspaceScope();
  const { workspaces, loading, error, refetch } = useWorkspaces();
  const selected = workspaces.find(workspace => workspace.id === workspaceId);

  if (loading) return <DataState state="loading" title={t('common.loading', 'Loading…')} />;
  if (error) return <DataState state="error" title={isPersian ? 'دریافت برندها انجام نشد.' : 'Could not load brands.'}
    action={<button type="button" onClick={() => refetch()}>{isPersian ? 'تلاش دوباره' : 'Try again'}</button>} />;
  return <>
    <NativeSelect label={isPersian ? 'برند / فضای کاری' : 'Brand / workspace'}
      value={selected ? String(selected.id) : ''} onChange={event => selectWorkspace(event.target.value)}>
      <option value="">{isPersian ? 'یک برند انتخاب کنید' : 'Select a brand'}</option>
      {workspaces.map(workspace => <option key={workspace.id} value={String(workspace.id)}>{workspace.company || workspace.name}</option>)}
    </NativeSelect>
    {selected ? <CalendarView key={selected.id} clientId={selected.id} />
      : <DataState state="empty" title={isPersian ? 'برای مشاهده تقویم، یک برند مجاز انتخاب کنید.' : 'Select an accessible brand to view its calendar.'} />}
  </>;
}
