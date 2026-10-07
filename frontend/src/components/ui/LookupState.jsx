import { useRef } from 'react';
import { useLanguage } from '@/i18n';
import { ReadState } from './accountRecovery';
export default function LookupState({ resource }) {
  const { t } = useLanguage();
  const focus = useRef(null);
  const empty = resource.data && Object.values(resource.data).every(list => !list.length);
  return <section ref={focus} tabIndex={-1} aria-label={t('lookup.title')} className="space-y-2">
    <ReadState resource={resource} refresh={resource.refetch} returnFocusRef={focus} />
    {(!resource.data || empty) && !resource.query.isPending && <p role="status">{t('lookup.fallback')}</p>}
  </section>;
}
