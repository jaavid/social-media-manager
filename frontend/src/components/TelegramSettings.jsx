import { useLanguage } from "../i18n";
import { useState } from 'react';
import { api } from '@/services/http/client';
import { apiError } from '@/services/http/errors';
import { useQuery } from '@tanstack/react-query';
import { QK } from '@/services/queryClient';
import DataState from '@/components/ui/DataState';
import Card from './ui/Card';
import Button from './ui/Button';
export default function TelegramSettings({ workspaceId, accountId }) {
  const {
    tr, t
  } = useLanguage();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [telegramUser, setTelegramUser] = useState('');
  const [appUser, setAppUser] = useState('');
  const query = useQuery({
    queryKey: QK.connectionExtension(workspaceId, accountId, 'telegram_settings'),
    queryFn: async ({ signal }) => {
      const { data } = await api.get(`/telegram-accounts/${accountId}/settings/`, { signal });
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.rich_enabled !== 'boolean'
          || typeof data.assistant_enabled !== 'boolean' || !data.destination_context
          || typeof data.destination_context !== 'object') throw new Error('Invalid settings response');
      return data;
    },
    retry: false,
  });
  const settings = draft || query.data;
  const setSettings = setDraft;
  const act = async (path, body) => {
    if (pending) return;
    setError(false); setSaved(false); setPending(true);
    try {
      await api.post(`/telegram-accounts/${accountId}/${path}/`, body);
      setSaved(true);
      if (path === 'settings') { setDraft(null); void query.refetch(); }
    } catch {
      setError(true);
    } finally { setPending(false); }
  };
  const failed = apiError(query.error).status === 403 ? 'forbidden' : 'error';
  if (query.isPending) return <DataState compact state="loading" title={t('connections.loading')} />;
  if ((query.isError && !query.data) || failed === 'forbidden') return <DataState compact state={failed}
    title={t(failed === 'forbidden' ? 'connections.forbidden' : 'connections.failed')}
    action={<Button onClick={() => query.refetch()}>{t('connections.retry')}</Button>} />;
  const context = settings?.destination_context || {};
  const type = context.destination_type || 'channel';
  return <Card padding="md" className="mt-5"><Card.Header title={tr("Telegram topics and assistant")} />
    {query.isError && <DataState compact state="partial" title={t('connections.partial')} action={<Button onClick={() => query.refetch()}>{t('connections.retry')}</Button>} />}
    {error && <DataState compact state="error" title={t('connections.mutationFailed')} />}
    {saved && <p role="status">{tr('Saved')}</p>}
    {settings && <fieldset disabled={pending} className="border-0 p-0" style={{
      display: 'grid',
      gap: 8,
      marginTop: 12
    }}>
      <label>{tr("Destination")}<select value={type} onChange={e => setSettings({
          ...settings,
          destination_context: {
            destination_type: e.target.value
          }
        })}>
        {['channel', 'group', 'supergroup', 'forum_supergroup', 'channel_direct_messages', 'private', 'private_forum'].map(t => <option key={t}>{t}</option>)}
      </select></label>
      {['forum_supergroup', 'private_forum', 'channel_direct_messages'].includes(type) && <label>{tr("Known topic ID")}<input type="number" min="1" value={context.message_thread_id || context.direct_messages_topic_id || ''} onChange={e => {
          const key = type === 'channel_direct_messages' ? 'direct_messages_topic_id' : 'message_thread_id';
          const next = {
            destination_type: type
          };
          if (e.target.value) next[key] = Number(e.target.value);
          setSettings({
            ...settings,
            destination_context: next
          });
        }} /></label>}
      {type === 'private_forum' && <p>{tr("Enable Threaded mode in BotFather before using private topics.")}</p>}
      <label><input type="checkbox" checked={settings.rich_enabled} onChange={e => setSettings({
          ...settings,
          rich_enabled: e.target.checked
        })} />{tr("Enable Rich Messages")}</label>
      <label><input type="checkbox" checked={settings.assistant_enabled} onChange={e => setSettings({
          ...settings,
          assistant_enabled: e.target.checked
        })} />{tr("Enable private editorial assistant")}</label>
      <label><input type="checkbox" checked={!!settings.assistant_rich} onChange={e => setSettings({
          ...settings,
          assistant_rich: e.target.checked
        })} />{tr("Use rich assistant drafts")}</label>
      <Button onClick={() => act('settings', {
        destination_context: context,
        assistant_enabled: settings.assistant_enabled,
        rich_enabled: settings.rich_enabled,
        assistant_rich: settings.assistant_rich
      })}>{tr("Save Telegram settings")}</Button>
      <Button onClick={() => act('webhook', {})}>{tr("Configure secure webhook")}</Button>
      <p>{tr("Webhook:")}{settings.webhook_enabled ? 'enabled' : 'disabled'}{tr(". Last update:")}{settings.last_update_at || 'none'}</p>
      <p>{tr("Assistant access requires an explicit Telegram identity link to an authorized application user.")}</p>
      <label>{tr("Telegram user ID")}<input value={telegramUser} onChange={e => setTelegramUser(e.target.value)} /></label>
      <label>{tr("Application user ID")}<input value={appUser} onChange={e => setAppUser(e.target.value)} /></label>
      <Button onClick={() => act('assistant-link', {
        telegram_user_id: Number(telegramUser),
        user_id: Number(appUser)
      })}>{tr("Link assistant identity")}</Button>
    </fieldset>}
  </Card>;
}
