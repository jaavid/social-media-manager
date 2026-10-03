import { useLanguage } from "../i18n";
import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from './ui/Card';
import Button from './ui/Button';
export default function TelegramSettings() {
  const {
    tr
  } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState('');
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [telegramUser, setTelegramUser] = useState('');
  const [appUser, setAppUser] = useState('');
  useEffect(() => {
    api.get('/telegram-accounts/').then(({
      data
    }) => setAccounts(data.results || data)).catch(() => {});
  }, []);
  useEffect(() => {
    setSettings(null);
    setError('');
    if (selected) api.get(`/telegram-accounts/${selected}/settings/`).then(({
      data
    }) => setSettings(data)).catch(e => setError(e.response?.data?.detail || 'Telegram settings unavailable'));
  }, [selected]);
  const act = async (path, body) => {
    setError('');
    try {
      const {
        data
      } = await api.post(`/telegram-accounts/${selected}/${path}/`, body);
      if (path === 'settings') setSettings(data);else setError('Saved');
    } catch (e) {
      setError(e.response?.data?.detail || JSON.stringify(e.response?.data || 'Request failed'));
    }
  };
  if (!accounts.length) return null;
  const context = settings?.destination_context || {};
  const type = context.destination_type || 'channel';
  return <Card padding="md" className="mt-5"><Card.Header title={tr("Telegram topics and assistant")} />
    <select aria-label={tr("Telegram account")} value={selected} onChange={e => setSelected(e.target.value)}><option value="">{tr("Select account")}</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.display_name || a.external_id}</option>)}</select>
    {error && <p role="status">{error}</p>}
    {settings && <div style={{
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
    </div>}
  </Card>;
}
