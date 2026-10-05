// Provider-owned UI boundaries. Generic connections never branch on provider keys.
import TelegramSettings from '@/components/TelegramSettings';
const extensions = { telegram_settings: TelegramSettings };
export default function ProviderExtensions({ names, workspaceId, accountId }) {
  return names.map(name => {
    const Extension = extensions[name];
    return Extension ? <Extension key={name} workspaceId={workspaceId} accountId={accountId} /> : null;
  });
}
