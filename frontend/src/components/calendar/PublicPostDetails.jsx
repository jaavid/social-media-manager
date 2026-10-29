import { useLanguage } from '@/i18n';

export default function PublicPostDetails({ details }) {
  const { isPersian } = useLanguage();
  if (!details || !Object.keys(details).length) return null;
  const text = (fa, en) => isPersian ? fa : en;
  const urls = key => (details[key] || []).filter(url => typeof url === 'string' && /^https:\/\//i.test(url));
  return <div className="min-w-0 space-y-2 text-sm" aria-label={text('جزئیات پست عمومی', 'Public post details')}>
    {details.location && <p>{text('مکان', 'Location')}: {details.location}</p>}
    {details.content_type && <p>{text('نوع محتوا', 'Content type')}: {details.content_type}</p>}
    {details.product_type && <p>{text('قالب انتشار', 'Publishing format')}: {details.product_type}</p>}
    {details.hashtags?.length > 0 && <p className="break-words">{text('هشتگ‌ها', 'Hashtags')}: {details.hashtags.join(' · ')}</p>}
    {details.tagged_users?.length > 0 && <p className="break-words">{text('حساب‌های نام‌برده', 'Tagged accounts')}: {details.tagged_users.join(' · ')}</p>}
    <div className="flex flex-wrap gap-3">
      {['photos', 'videos'].flatMap(key => urls(key).map((url, index) => <a key={`${key}-${index}`} className="inline-flex min-h-11 items-center underline"
        href={url} target="_blank" rel="noreferrer">{key === 'photos' ? text('تصویر', 'Photo') : text('ویدئو', 'Video')} {index + 1}</a>))}
    </div>
  </div>;
}
