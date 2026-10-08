import { useLanguage } from '@/i18n';
import { ReadState } from './accountRecovery';
import DataState from './DataState';
import Button from './Button';
export default function FeedState({ feed }) {
  const { t } = useLanguage();
  return <div className="space-y-2">
    <ReadState resource={feed} refresh={feed.refetch} busy={feed.busy} />
    {feed.busy && <DataState compact state="refreshing" title={t('account.pending')} />}
    {feed.write?.error && <DataState compact state="error" title={t(feed.write.uncertain ? 'account.uncertain' : 'account.writeFailed')} referenceId={feed.write.error.referenceId} action={<Button onClick={feed.refetch} disabled={feed.busy}>{t('account.checkStatus')}</Button>} />}
    {feed.write?.success && <p role="status">{t('account.saved')}</p>}
  </div>;
}
