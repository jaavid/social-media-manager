'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/i18n';
import { APPEARANCE_DEFAULTS, contrastRatio, readAppearance, resetAppearance, saveAppearance } from '@/lib/appearance';

const COLOR_FIELDS = ['primary', 'onPrimary', 'page', 'card', 'text'];
const SLIDERS = [
  { field: 'textScale', min: 85, max: 125, unit: '%' },
  { field: 'radiusScale', min: 50, max: 150, unit: '%' },
  { field: 'spacing', min: 3, max: 6, unit: 'px' },
];

/** Browser-local appearance editor. Account/workspace synchronization is intentionally out of scope. */
export default function AppearanceEditor() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [appearance, setAppearance] = useState(APPEARANCE_DEFAULTS);
  useEffect(() => { setAppearance(readAppearance()); }, []);
  function update(next) {
    setAppearance(saveAppearance(next, theme));
  }
  function updateColor(mode, field, value) {
    update({ ...appearance, [mode]: { ...appearance[mode], [field]: value } });
  }
  const fieldLabels = {
    primary: t('appearance.primary'), onPrimary: t('appearance.onPrimary'),
    page: t('appearance.page'), card: t('appearance.card'), text: t('appearance.text'),
  };
  return (
    <section className="appearance-editor" aria-label={t('appearance.title')}>
      <div>
        <h3>{t('appearance.title')}</h3>
        <p className="appearance-note">{t('appearance.localOnly')}</p>
      </div>
      <div className="appearance-palette-grid">
        {['light', 'dark'].map(mode => (
          <fieldset className="appearance-palette" key={mode}>
            <legend>{t(mode === 'dark' ? 'appearance.darkPalette' : 'appearance.lightPalette')}</legend>
            {COLOR_FIELDS.map(field => (
              <label className="appearance-field" key={field}>
                <span>{fieldLabels[field]}</span>
                <input type="color" value={appearance[mode][field]}
                  onChange={event => updateColor(mode, field, event.target.value)}
                  aria-label={`${mode}: ${fieldLabels[field]}`} />
              </label>
            ))}
            {contrastRatio(appearance[mode].primary, appearance[mode].onPrimary) < 4.5 && (
              <p role="status" className="appearance-warning">{t('appearance.contrastWarning')}</p>
            )}
          </fieldset>
        ))}
      </div>
      <div className="appearance-palette">
        <h3>{t('appearance.geometry')}</h3>
        {SLIDERS.map(({ field, min, max, unit }) => (
          <label className="appearance-field" key={field}>
            <span>{t(`appearance.${field}`)}</span>
            <input type="range" min={min} max={max} step="1" value={appearance[field]}
              onChange={event => update({ ...appearance, [field]: Number(event.target.value) })} />
            <output>{appearance[field]}{unit}</output>
          </label>
        ))}
        <label className="appearance-field">
          <span>{t('appearance.density')}</span>
          <select value={appearance.density}
            onChange={event => update({ ...appearance, density: event.target.value })}>
            <option value="comfortable">{t('appearance.comfortable')}</option>
            <option value="compact">{t('appearance.compact')}</option>
          </select>
        </label>
        <label className="appearance-field">
          <span>{t('appearance.motion')}</span>
          <select value={appearance.motion}
            onChange={event => update({ ...appearance, motion: event.target.value })}>
            <option value="system">{t('appearance.followSystem')}</option>
            <option value="reduced">{t('appearance.reduced')}</option>
          </select>
        </label>
      </div>
      <div className="appearance-preview">
        <strong>{t('appearance.preview')}</strong>
        <div className="appearance-preview-surface">
          <span>{t('appearance.previewText')}</span>
          <button type="button" className="appearance-preview-action">{t('appearance.previewAction')}</button>
        </div>
      </div>
      <button type="button" className="ds-input-frame appearance-preview-action"
        onClick={() => setAppearance(resetAppearance(theme))}>
        {t('appearance.reset')}
      </button>
    </section>
  );
}
