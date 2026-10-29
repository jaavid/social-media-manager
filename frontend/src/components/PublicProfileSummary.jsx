import { useLanguage } from '@/i18n';

/** Public facts only. Missing metrics are unknown, including on partial syncs. */
export default function PublicProfileSummary({ data }) {
  const { isPersian, formatDate, formatNumber } = useLanguage();
  if (!data) return null;
  const text = (fa, en) => isPersian ? fa : en;
  const profile = data.profile || {};
  const metrics = [
    ['followers', text('دنبال‌کننده', 'Followers')],
    ['following', text('دنبال‌شونده', 'Following')],
    ['posts_count', text('تعداد پست‌ها', 'Posts')],
  ];
  const stats = data.sample_metrics;
  const statuses = {
    syncing: text('در حال دریافت', 'Collecting'),
    partial: text('بخشی از اطلاعات دریافت شده است', 'Partially collected'),
    error: text('دریافت کامل نشد؛ اطلاعات قبلی حفظ شده است', 'Collection incomplete; previous data retained'),
    idle: text('در انتظار دریافت', 'Awaiting collection'),
    ok: text('اطلاعات عمومی پیج', 'Public profile data'),
  };
  return <section className="min-w-0 space-y-3 rounded-lg border p-3 text-sm" aria-label={text('اطلاعات عمومی پیج', 'Public profile data')}>
    <p className="m-0 text-xs text-muted-foreground" role="status">{statuses[data.status] || statuses.idle}</p>
    {/^https:\/\//i.test(profile.profile_image_link || '') && <img src={profile.profile_image_link} alt={text('تصویر پروفایل', 'Profile photo')} width={48} height={48} className="size-12 rounded-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />}
    {(profile.full_name || profile.is_verified) && <p className="m-0 font-semibold break-words">
      {profile.full_name} {profile.is_verified && <span>{text('· تأییدشده', '· Verified')}</span>}
    </p>}
    {profile.id && <p className="m-0 text-xs text-muted-foreground">{text('شناسهٔ عمومی', 'Public ID')}: <bdi>{profile.id}</bdi></p>}
    {profile.biography && <p className="m-0 whitespace-pre-wrap break-words">{profile.biography}</p>}
    <dl className="grid grid-cols-3 gap-3">
      {metrics.map(([key, label]) => <div key={key} className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="m-0 font-semibold">{profile[key] == null ? '—' : formatNumber(profile[key])}</dd>
      </div>)}
    </dl>
    {(profile.business_category_name || profile.category_name) && <p className="m-0">{profile.business_category_name || profile.category_name}</p>}
    {profile.is_business_account != null && <p className="m-0 text-xs">{profile.is_business_account ? text('حساب تجاری', 'Business account') : text('حساب غیرتجاری', 'Non-business account')}</p>}
    {profile.is_professional_account != null && <p className="m-0 text-xs">{profile.is_professional_account ? text('حساب حرفه‌ای', 'Professional account') : text('حساب غیرحرفه‌ای', 'Non-professional account')}</p>}
    {profile.url && <a className="inline-flex min-h-11 items-center underline" href={profile.url} target="_blank" rel="noreferrer">{text('مشاهده پروفایل', 'View profile')}</a>}
    {/^https:\/\//i.test(profile.external_url || '') && <a className="ms-3 inline-flex min-h-11 items-center underline" href={profile.external_url} target="_blank" rel="noreferrer">{text('وب‌سایت پیج', 'Profile website')}</a>}
    {stats?.sample_size > 0 && <div className="space-y-1 border-t pt-2 text-xs">
      <p>{text('آمار نمونهٔ پست‌های دریافت‌شده', 'Collected post sample')} · {formatNumber(stats.sample_size)}</p>
      <p>{text('میانگین پسند', 'Average likes')}: {stats.avg_likes == null ? '—' : formatNumber(stats.avg_likes, { maximumFractionDigits: 1 })}</p>
      <p>{text('میانگین دیدگاه', 'Average comments')}: {stats.avg_comments == null ? '—' : formatNumber(stats.avg_comments, { maximumFractionDigits: 1 })}</p>
      <p>{text('نرخ تعامل نمونه', 'Sample engagement rate')}: {stats.engagement_rate == null ? '—' : `${formatNumber(stats.engagement_rate, { maximumFractionDigits: 2 })}%`}</p>
    </div>}
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>{text('آخرین دریافت پروفایل', 'Profile collected')}: {data.profile_fetched_at ? formatDate(data.profile_fetched_at) : '—'}</p>
      <p>{text('آخرین دریافت پست‌ها', 'Posts collected')}: {data.posts_fetched_at ? formatDate(data.posts_fetched_at) : '—'}</p>
      <p>{text('به‌روزرسانی خودکار هر ۴۸ ساعت؛ درخواست دستی از اطلاعات تازهٔ موجود استفاده می‌کند.', 'Refreshes every 48 hours; manual requests reuse fresh data.')}</p>
      {data.next_refresh_at && <p>{text('موعد بررسی بعدی', 'Next refresh due')}: {formatDate(data.next_refresh_at)}</p>}
    </div>
  </section>;
}
