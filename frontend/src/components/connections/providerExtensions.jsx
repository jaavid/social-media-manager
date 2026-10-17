// Provider-owned UI boundaries. Generic connections never branch on provider keys.
import TelegramSettings from '@/components/TelegramSettings';
import { DiscordConnection, RedditConnection } from './CommunityConnection';
const extensions = { telegram_settings: TelegramSettings, discord_connection: DiscordConnection, reddit_connection: RedditConnection };
export default function ProviderExtensions({ names, workspaceId, accountId, permissions }) {
  return names.map(name => {
    const Extension = extensions[name];
    return Extension ? <Extension key={name} workspaceId={workspaceId} accountId={accountId} permissions={permissions} /> : null;
  });
}
