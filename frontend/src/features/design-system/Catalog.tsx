'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useTheme } from '@/hooks/useTheme';
import { setLanguage } from '@/i18n';
import { message } from '@/i18n/translate';
import type { MessageKey } from '@/i18n/messages';

export default function Catalog() {
  const language = useLocale() === 'en' ? 'en' : 'fa';
  const t = (key: MessageKey) => message(key, language);
  const { setTheme, preference } = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | number>('example');
  return <main className="mx-auto max-w-3xl space-y-8 p-8 font-sans">
    <h1 className="text-3xl font-bold">{t('catalog.title')}</h1>
    <p>{t('catalog.intro')}</p>
    <div className="flex flex-wrap gap-4">
      <label>{t('catalog.language')}<select value={language} onChange={event => setLanguage(event.target.value)}>
        <option value="fa">{t('catalog.persian')}</option><option value="en">{t('catalog.english')}</option>
      </select></label>
      <label>{t('catalog.theme')}<select value={preference} onChange={event => setTheme(event.target.value)}>
        {(['light', 'dark', 'system'] as const).map(theme => <option key={theme} value={theme}>{t(`catalog.${theme}`)}</option>)}
      </select></label>
    </div>
    <section className="app-surface rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-bold">{t('catalog.typography')}</h2>
      {['sm', 'base', 'lg'].map(size => <p key={size} data-sample={size} className={{ sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[size]}>
        {t('common.home')} · Social Stats <bdi className="bidi-isolate">team@example.com</bdi>
      </p>)}
    </section>
    <section className="app-surface rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-bold">{t('catalog.status')}</h2>
      <div className="flex flex-wrap gap-4">{(['success', 'warning', 'danger', 'info'] as const).map(status =>
        <span key={status} data-status={status} style={{ color: `var(--${status})`, background: `var(--${status}-bg)`, padding: 'var(--space-2)' }}>{t(`catalog.${status}`)}</span>)}</div>
    </section>
    <div className="flex flex-wrap gap-4">
      <Button>{t('catalog.primary')}</Button><Button variant="danger">{t('catalog.destructive')}</Button>
      <Button disabled>{t('catalog.disabled')}</Button><Button variant="secondary" onClick={() => setOpen(true)}>{t('catalog.modal')}</Button>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title={t('catalog.dialog')} description={t('catalog.intro')}>
      <Select label={t('catalog.select')} value={value} onChange={setValue} options={[{ value: 'example', label: t('catalog.option') }]} />
    </Modal>
  </main>;
}
