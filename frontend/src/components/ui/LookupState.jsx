import { useRef } from 'react';
import { useLanguage } from '@/i18n';
import { ReadState } from './accountRecovery';
import DataState from './DataState';
export default function LookupState({ resource }) {
  const { t } = useLanguage();
  const focus = useRef(null);
  const empty = resource.data && Object.values(resource.data).every(list => !list.length);
  const partial = Array.isArray(resource.data?.platforms) && Array.isArray(resource.lookups?.platforms) && resource.data.platforms.length > resource.lookups.platforms.length;
  return <section ref={focus} tabIndex={-1} aria-label={t('lookup.title')} className="space-y-2">
    <ReadState resource={resource} refresh={resource.refetch} returnFocusRef={focus} />
    {partial && <DataState compact state="partial" title={t('lookup.partial')} />}
    {empty && !resource.query.isPending && !resource.query.isError && !resource.query.isPaused && <DataState compact state="empty" title={t('lookup.empty')} />}
    {!Array.isArray(resource.lookups?.platforms) && resource.data !== undefined && !resource.denied && resource.enabled !== false && !resource.query.isPending && !resource.query.isError && !resource.query.isPaused && <p role="status">{t('lookup.fallback')}</p>}
  </section>;
}
