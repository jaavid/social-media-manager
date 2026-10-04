import { Languages } from 'lucide-react';
import { useLanguage } from '../../i18n';

export default function LanguageToggle({ variant = 'default' }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label
      title={t('common.language', 'Language')}
      style={{
        height: 36,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        border: variant === 'ghost' ? 'none' : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        background: variant === 'ghost' ? 'transparent' : 'var(--surface-card)',
        color: 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <Languages size={14} />
      <select
        aria-label={t('common.language', 'Language')}
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        style={{
          border: 0,
          outline: 0,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        <option value="en">English</option>
        <option value="fa">فارسی</option>
      </select>
    </label>
  );
}
