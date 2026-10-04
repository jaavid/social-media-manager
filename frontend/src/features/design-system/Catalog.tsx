'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { useTheme } from '@/hooks/useTheme';
import { message } from '@/i18n/translate';
import type { MessageKey } from '@/i18n/messages';

export default function Catalog() {
  const locale = useLocale();
  const [language, setLanguage] = useState<'fa' | 'en'>(locale === 'en' ? 'en' : 'fa');
  const t = (key: MessageKey) => message(key, language);
  const { setTheme, preference } = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | number>('example');
  return <main lang={language} dir={language === 'fa' ? 'rtl' : 'ltr'} className="mx-auto min-w-0 max-w-3xl space-y-8 p-4 sm:p-8 font-sans" data-typography-catalog>
    <h1 className="text-3xl font-bold">{t('catalog.title')}</h1>
    <p>{t('catalog.intro')}</p>
    <div className="flex flex-wrap gap-4">
      <label>{t('catalog.language')}<select value={language} onChange={event => setLanguage(event.target.value as 'fa' | 'en')}>
        <option value="fa">{t('catalog.persian')}</option><option value="en">{t('catalog.english')}</option>
      </select></label>
      <label>{t('catalog.theme')}<select value={preference} onChange={event => setTheme(event.target.value)}>
        {(['light', 'dark', 'system'] as const).map(theme => <option key={theme} value={theme}>{t(`catalog.${theme}`)}</option>)}
      </select></label>
    </div>
    <section className="app-surface rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-bold">{t('catalog.typography')}</h2>
      {(['fa', 'en'] as const).map(sampleLanguage => <div key={sampleLanguage} lang={sampleLanguage} dir={sampleLanguage === 'fa' ? 'rtl' : 'ltr'} className="mt-4 min-w-0 space-y-3" data-language-sample={sampleLanguage}>
        {['sm', 'base', 'lg'].map(size => <p key={size} data-sample={size} className={{ sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[size]}>
          {message('catalog.sample', sampleLanguage)}
        </p>)}
        <p className="break-words">{message('catalog.mixed', sampleLanguage)} <bdi dir="ltr" lang="en">{t('catalog.identifier')}</bdi> · <bdi dir="ltr" lang="en">team@example.com</bdi> · <bdi dir="ltr" lang="en">{t('catalog.url')}</bdi></p>
        {[400, 500, 600, 700, 800].map(weight => <p key={weight} data-weight={weight} style={{ fontWeight: weight }}>{weight} · {message('catalog.sample', sampleLanguage)}</p>)}
        <div className="flex flex-wrap items-start gap-3">
          <Button size="xs"><span>{message('catalog.sample', sampleLanguage)}</span></Button>
          <Badge>{message('catalog.sample', sampleLanguage)}</Badge>
        </div>
        <Input aria-label={message('catalog.sample', sampleLanguage)} defaultValue={message('catalog.sample', sampleLanguage)} />
        <Input type="email" aria-label={`Email ${sampleLanguage}`} defaultValue="team@example.com" />
        <Table><TableBody><TableRow><TableCell>{message('catalog.sample', sampleLanguage)}</TableCell><TableCell><bdi dir="ltr">{t('catalog.identifier')}</bdi></TableCell></TableRow></TableBody></Table>
      </div>)}
    </section>
    <section className="app-surface rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-bold">{t('catalog.status')}</h2>
      <div className="flex flex-wrap gap-4">{(['success', 'warning', 'danger', 'info'] as const).map(status =>
        <span key={status} data-status={status} style={{ color: `var(--${status})`, background: `var(--${status}-bg)`, padding: 'var(--space-2)' }}>{t(`catalog.${status}`)}</span>)}</div>
    </section>
    <div className="flex flex-wrap gap-4">
      <Button><span>{t('catalog.primary')}</span></Button><Button variant="danger"><span>{t('catalog.destructive')}</span></Button>
      <Button disabled><span>{t('catalog.disabled')}</span></Button><Button variant="secondary" onClick={() => setOpen(true)}><span>{t('catalog.modal')}</span></Button>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title={t('catalog.dialog')} description={t('catalog.intro')}>
      <Select label={t('catalog.select')} value={value} onChange={setValue} options={[{ value: 'example', label: t('catalog.option') }]} />
    </Modal>
  </main>;
}
