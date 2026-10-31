import PublicProfileSummary from './PublicProfileSummary';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarAPI } from '@/services/domains/publishing';
import { connectionsAPI } from '@/services/domains/connections';
import { useLanguage } from '@/i18n';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';
import Badge from '@/components/ui/Badge';
import SocialPlatformIcon from '@/components/ui/SocialPlatformIcon';

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
  return <div className="space-y-4">
    <p className="m-0 text-xs leading-relaxed text-muted-foreground">{t('watchlist.description')}</p>
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
    <ul className="m-0 divide-y divide-[var(--border-subtle)] p-0">
      {sources.map(source => <li key={source.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <SocialPlatformIcon platform="instagram" size={19} />
            <strong className="min-w-0 truncate text-sm" dir="ltr">@{source.username}</strong>
            <Badge variant={source.publishing_ready ? 'success' : 'info'}>
              {t(source.publishing_ready ? 'watchlist.connected' : 'watchlist.readOnly')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t(source.is_active ? `watchlist.status.${source.sync_status}` : 'watchlist.paused')}</p>
          {source.is_active && source.error_code === 'brightdata_empty_result' &&
            <p role="status" className="text-sm text-muted-foreground">{t('watchlist.emptyResult')}</p>}
          {source.last_synced_at && <p className="text-xs text-muted-foreground">{t('watchlist.updated', undefined, { date: formatDate(source.last_synced_at) })}</p>}
          <PublicProfileSummary data={source.public_data} compact />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
  </div>;
}
