import PublicProfileSummary from './PublicProfileSummary';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarAPI } from '@/services/domains/publishing';
import { connectionsAPI } from '@/services/domains/connections';
import { useLanguage } from '@/i18n';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';

export default function AccountWatchlist({ workspaceId, canAdd, canVerify }) {
  const { t, formatDate } = useLanguage();
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const query = useQuery({
    queryKey: ['account-watchlist', workspaceId],
    queryFn: () => calendarAPI.getSources({ client_id: workspaceId, include_inactive: 'true' }),
    enabled: Number.isSafeInteger(workspaceId) && workspaceId > 0,
    refetchInterval: 60000,
  });
  const sources = query.data?.data || [];
  const mutate = async action => {
    setPending(true);
    setError(false);
    try {
      await action();
      await query.refetch();
      setUsername('');
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };
  return <Card padding="md" className="space-y-4">
    <h3 className="text-lg font-semibold">{t('watchlist.title')}</h3>
    <p className="text-sm text-muted-foreground">{t('watchlist.description')}</p>
    {canAdd && <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      void mutate(() => calendarAPI.addSource({ client: workspaceId, platform: 'instagram', username }));
    }}>
      <Input label={t('watchlist.username')} value={username} onChange={event => setUsername(event.target.value)} required maxLength={300} />
      <Button type="submit" loading={pending} disabled={!username.trim()}>{t('watchlist.add')}</Button>
    </form>}
    {(error || query.isError) && <DataState compact state="error" title={t('watchlist.failed')}
      action={<Button variant="secondary" onClick={() => query.refetch()}>{t('connections.retry')}</Button>} />}
    {query.isPending && <DataState compact state="loading" title={t('connections.loading')} />}
    {!query.isPending && !query.isError && !sources.length && <p>{t('watchlist.empty')}</p>}
    <ul className="space-y-3">
      {sources.map(source => <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-medium" dir="ltr">@{source.username}</p>
          <p className="text-sm text-muted-foreground">{t(source.is_active ? `watchlist.status.${source.sync_status}` : 'watchlist.paused')}</p>
          {source.is_active && source.error_code === 'brightdata_empty_result' &&
            <p role="status" className="text-sm text-muted-foreground">{t('watchlist.emptyResult')}</p>}
          {source.last_synced_at && <p className="text-xs text-muted-foreground">{t('watchlist.updated', undefined, { date: formatDate(source.last_synced_at) })}</p>}
          <PublicProfileSummary data={source.public_data} />
          <p className="text-xs">{t(source.publishing_ready ? 'watchlist.connected' : 'watchlist.readOnly')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {source.is_active && source.permissions?.connect_platforms && <Button size="sm" variant="secondary" disabled={pending}
            onClick={() => mutate(() => calendarAPI.syncSource(source.id))}>{t('watchlist.refresh')}</Button>}
          {!source.is_active && source.permissions?.connect_platforms && <Button size="sm" disabled={pending}
            onClick={() => mutate(() => calendarAPI.addSource({ client: workspaceId, username: source.username }))}>{t('watchlist.resume')}</Button>}
          {source.is_active && source.permissions?.disconnect_platforms && <Button size="sm" variant="secondary" disabled={pending}
            onClick={() => mutate(() => calendarAPI.removeSource(source.id))}>{t('watchlist.pause')}</Button>}
          {!source.publishing_ready && canVerify && source.permissions?.connect_platforms && <Button size="sm"
            onClick={() => window.location.assign(connectionsAPI.oauthPath(workspaceId, 'instagram', source.social_account))}>{t('watchlist.verify')}</Button>}
          {source.publishing_ready && (source.permissions?.publish_posts || source.permissions?.schedule_posts) &&
            <a className="text-sm underline" href={`/dashboard/composer?workspace=${workspaceId}&account=${source.social_account}`}>{t('watchlist.compose')}</a>}
        </div>
      </li>)}
    </ul>
  </Card>;
}
