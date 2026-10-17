import { useState } from 'react';
import Button from '@/components/ui/Button';
import { connectionsAPI } from '@/services/domains/connections';
import { useLanguage } from '@/i18n';

function CommunityConnection({ workspaceId, accountId, provider, permissions }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState('');
  async function sync() {
    if (pending) return;
    setPending(true);
    setState('');
    try {
      await connectionsAPI.syncInbox(workspaceId, provider, accountId);
      setState('community.queued');
    } catch {
      setState('community.failed');
    } finally {
      setPending(false);
    }
  }
  return <div className="space-y-2 text-sm">
    <p>{t(provider === 'discord' ? 'community.discordHelp' : 'community.redditHelp')}</p>
    {permissions?.view_inbox && <Button variant="secondary" onClick={sync} loading={pending}>{t('community.sync')}</Button>}
    {state && <p role="status">{t(state)}</p>}
  </div>;
}
export const DiscordConnection = props => <CommunityConnection {...props} provider="discord" />;
export const RedditConnection = props => <CommunityConnection {...props} provider="reddit" />;
