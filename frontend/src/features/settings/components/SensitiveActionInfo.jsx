import { useLanguage } from '@/i18n';

/** Native disclosure preserves keyboard and screen-reader semantics. */
export default function SensitiveActionInfo({ summaryKey, detailKeys = [] }) {
  const { t } = useLanguage();
  return <div className="space-y-2 text-sm">
    <p>{t(summaryKey)}</p>
    {detailKeys.length > 0 && <details className="rounded-md border border-border px-3 py-2">
      <summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{t('settings.details')}</summary>
      <div className="space-y-2 pt-2 text-muted-foreground">{detailKeys.map(key => <p key={key}>{t(key)}</p>)}</div>
    </details>}
  </div>;
}
