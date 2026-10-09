/* Provider-owned editor extensions. Generic Composer resolves declared slot IDs. */
import TelegramComposer, { emptyRich, RichPreview } from './TelegramComposer';

function TelegramEditor({ mode, value, onChange, assets, setAssets }) {
  return (
    <TelegramComposer
      mode={mode}
      value={value}
      onChange={onChange}
      assets={assets}
      onCaption={(i, caption) =>
        setAssets((current) => current.map((a, j) => (i === j ? { ...a, caption } : a)))
      }
      onMove={(i) =>
        setAssets((current) => {
          const next = [...current];
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
          return next;
        })
      }
    />
  );
}
const telegram = {
  Editor: TelegramEditor,
  prepare(mode, value, assets) {
    const options = { ...value };
    if (mode === 'album')
      options.media_items = assets.map((a) => ({
        ...a.providerItem,
        type: a.providerItem?.type || (a.mime_type?.startsWith('video/') ? 'video' : 'photo'),
        media: a.source_url || `asset:${a.id}`,
        ...(a.caption !== undefined ? { caption: a.caption } : {}),
      }));
    if (mode === 'rich') options.rich_message = value.rich_message || emptyRich;
    if (mode === 'poll') options.poll = value.poll || { question: '', options: ['', ''] };
    return options;
  },
  recover(options) {
    return options.media_items?.map((item, index) => ({
      providerItem: item,
      id: item.media.startsWith('asset:') ? Number(item.media.slice(6)) : `existing-${index}`,
      source_url: item.media,
      caption: item.caption,
      mime_type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
      file_url: item.media.startsWith('asset:') ? '' : item.media,
    }));
  },
  Preview({ mode, value }) {
    if (mode === 'rich') return <RichPreview value={value.rich_message || emptyRich} />;
    if (mode === 'poll')
      return (
        <div>
          <strong>{value.poll?.question}</strong>
          {value.poll?.options?.map((o, i) => (
            <p key={i}>{typeof o === 'string' ? o : o.text}</p>
          ))}
        </div>
      );
    return null;
  },
};
export const composerExtensions = { telegram_composer: telegram };
