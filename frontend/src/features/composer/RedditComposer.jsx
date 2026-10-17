import Input from '@/components/ui/Input';
import { useLanguage } from '@/i18n';

export default function RedditComposer({ value, onChange }) {
  const { t } = useLanguage();
  const options = value.extensions?.reddit || {};
  const change = patch => onChange({ extensions: { ...value.extensions, reddit: { ...options, ...patch } } });
  return <fieldset className="space-y-3">
    <legend>{t('reddit.editor')}</legend>
    <Input label={t('reddit.title')} maxLength={300} value={options.title || ''}
      onChange={event => change({ title: event.target.value })} />
    <Input label={t('reddit.url')} type="url" dir="ltr" value={options.url || ''}
      onChange={event => change({ url: event.target.value })} />
    <p className="text-sm text-muted">{t('reddit.linkHelp')}</p>
    <Input label={t('reddit.flair')} dir="ltr" value={options.flair_id || ''}
      onChange={event => change({ flair_id: event.target.value })} />
    <label className="flex items-center gap-2"><input type="checkbox" checked={!!options.nsfw}
      onChange={event => change({ nsfw: event.target.checked })} />{t('reddit.nsfw')}</label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={!!options.spoiler}
      onChange={event => change({ spoiler: event.target.checked })} />{t('reddit.spoiler')}</label>
  </fieldset>;
}
