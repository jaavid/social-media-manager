'use client';
import { useLanguage } from '@/i18n';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**

import { useLanguage } from '@/i18n';
import { AppLink as Link } from '../../core/navigation';
import { Sparkles, Mic, BarChart3, MessageSquare, Wand2, Lightbulb, Hash, Inbox, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import useWorkspaceScope from '../../hooks/useWorkspaceScope';
import useNavigationAccess from '../../hooks/useNavigationAccess';
import { navigationHref, visibleSections } from '../../components/shell/navigationItems';

// This is a task-oriented directory, NOT a second provider/permission
// catalogue. The existing navigation registry is the sole source of routable,
// permission-filtered destinations. AI can suggest a draft; none of these
// links imply successful generation, supported reach, or automatic publishing.
const FEATURE_GROUPS = [
  {
    label: { fa: 'تولید محتوا', en: 'Create content' },
    items: [
      { id: 'compose', path: '/composer', icon: Wand2, title: { fa: 'ساخت پست', en: 'Create post' }, body: { fa: 'پیش‌نویس پست را بسازید و قبل از انتشار بررسی کنید.', en: 'Create a draft, then review it before publishing.' } },
      { id: 'caption', path: '/caption-writer', icon: Wand2, title: { fa: 'نوشتن کپشن', en: 'Caption writer' }, body: { fa: 'متن پیشنهادی را ویرایش و برای مقصد مناسب آماده کنید.', en: 'Review and edit suggested captions for your destination.' } },
      { id: 'post-ideas', path: '/post-ideas', icon: Lightbulb, title: { fa: 'ایده‌های پست', en: 'Post ideas' }, body: { fa: 'پیشنهادها را ببینید؛ انتخاب ایده به‌معنی انتشار نیست.', en: 'Explore ideas; selecting one does not publish anything.' } },
      { id: 'hashtags', path: '/hashtags', icon: Hash, title: { fa: 'بررسی هشتگ‌ها', en: 'Explore hashtags' }, body: { fa: 'پیشنهادهای هشتگ را پیش از استفاده ارزیابی کنید.', en: 'Check hashtag suggestions before using them.' } },
    ],
  },
  {
    label: { fa: 'پیام‌ها', en: 'Messages' },
    items: [
      { id: 'inbox', path: '/inbox', icon: Inbox, title: { fa: 'صندوق پیام', en: 'Inbox' }, body: { fa: 'پیام‌های حساب مجاز را ببینید و پاسخ را پیش از ارسال تأیید کنید.', en: 'Review messages in permitted accounts and confirm replies before sending.' } },
    ],
  },
  {
    label: { fa: 'تحلیل و راهنمایی', en: 'Insights and guidance' },
    items: [
      { id: 'insights', path: '/insights', icon: BarChart3, title: { fa: 'بینش‌ها', en: 'Insights' }, body: { fa: 'یافته‌های موجود را همراه با منبع و محدودیتشان بررسی کنید.', en: 'Review available insights alongside their source and limitations.' } },
      { id: 'brand-voice', path: '/brand-voice', icon: Mic, title: { fa: 'لحن برند', en: 'Brand voice' }, body: { fa: 'تنظیمات لحن را بررسی کنید؛ آموزش اختصاصی مدل تضمین نشده است.', en: 'Review tone preferences; model training is not implied.' } },
    ],
  },
];

export default function AIStudio() {
  const language = useLanguage();
  const lang = language.isPersian ? 'fa' : 'en';
  const can = useNavigationAccess();
  const { workspaceId } = useWorkspaceScope();
  const root = '/dashboard';
  const allowedPaths = new Set(visibleSections('analytics', root, can).flatMap(section => section.items.map(item => item.path)));
  const groups = FEATURE_GROUPS.map(group => ({
    ...group,
    items: workspaceId === null ? [] : group.items.filter(item => allowedPaths.has(item.path)),
  })).filter(group => group.items.length);

  return <div className="app-page app-page--lg" data-ai-studio>
    <PageHeader
      title={language.t('brand.studio')}
      subtitle={lang === 'fa'
        ? 'ابزارهای در دسترس همین فضای کاری؛ پیشنهادهای هوش مصنوعی پیش از استفاده نیاز به بررسی دارند.'
        : 'Tools available in this workspace. Review AI suggestions before using them.'}
    />
    {workspaceId === null ? (
      <Card as="section" aria-live="polite" className="space-y-2">
        <h2 className="font-semibold">{lang === 'fa' ? 'فضای کاری مشخص نیست' : 'No workspace selected'}</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {lang === 'fa' ? 'برای نمایش ابزارهای مجاز ابتدا یک فضای کاری انتخاب کنید.' : 'Select a workspace to discover permitted tools.'}
        </p>
      </Card>
    ) : groups.length ? groups.map(group => (
      <section key={group.label.en} className="mb-6" aria-label={group.label[lang]}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">{group.label[lang]}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {group.items.map(item => <FeatureCard key={item.id} item={item} lang={lang}
            to={navigationHref(root, 'analytics', { path: item.path }, workspaceId)} />)}
        </div>
      </section>
    )) : (
      <Card as="section" aria-live="polite">
        <p className="text-sm text-[var(--text-secondary)]">
          {lang === 'fa' ? 'در این فضای کاری ابزار مجازی برای این بخش یافت نشد.' : 'No permitted tools in this section for the selected workspace.'}
        </p>
      </Card>
    )}
    <Card as="aside" className="mt-5 flex items-start gap-3" aria-label={lang === 'fa' ? 'نکته درباره هوش مصنوعی' : 'AI guidance'}>
      <Sparkles className="mt-0.5 shrink-0 text-[var(--brand-primary-hover)]" size={19} aria-hidden="true" />
      <p className="text-sm text-[var(--text-secondary)]">
        {lang === 'fa'
          ? 'ساخت پیش‌نویس، تأیید و انتشار سه اقدام متفاوت‌اند. هیچ پیشنهادی به‌خودی‌خود منتشر نمی‌شود؛ نتیجه، هزینه و سهمیه را فقط از وضعیت واقعی همان ابزار بررسی کنید.'
          : 'Drafting, approval and publishing are separate actions. Suggestions do not publish automatically; check results, costs and quotas in the actual tool.'}
      </p>
    </Card>
  </div>;
}

function FeatureCard({ item, to, lang }) {
  const Icon = item.icon;
  return <Link to={to} className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-card p-4 no-underline shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] motion-reduce:transition-none">
    <span className="flex items-center justify-between text-[var(--brand-primary-hover)]">
      <Icon size={19} aria-hidden="true" />
      <ArrowRight size={15} aria-hidden="true" />
    </span>
    <span className="font-semibold text-foreground">{item.title[lang]}</span>
    <span className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.body[lang]}</span>
  </Link>;
}
