import TelegramSuggestions from '@/components/TelegramSuggestions';
const extensions = { telegram_engagement: TelegramSuggestions };
export default function EngagementExtensions({ names, accountId }) {
  return names.map(name => {
    const Extension = extensions[name];
    return Extension ? <Extension key={`${name}:${accountId}`} accountId={accountId} /> : null;
  });
}
