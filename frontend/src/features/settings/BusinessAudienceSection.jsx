/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import Textarea from '@/components/ui/Textarea';

import NativeSelect from '@/components/ui/NativeSelect';

import Input from '@/components/ui/Input';

import { cn } from '@/lib/utils';

import { Users } from 'lucide-react';

export function renderAudience({
  formData,
  handleInputChange,
  genderOptions,
  handleLocationToggle,
}) {
  return (
    <div
      className={cn(
        '[background:linear-gradient(180deg,_#ffffff_0%,_#fbfdff_100%)]',
        '[border:1px_solid_var(--border-default)]',
        '[border-radius:20px]',
        '[padding:20px_16px]',
        '[margin-bottom:12px]',
        '[box-shadow:0_2px_12px_rgba(0,0,0,.05)]',
      )}
    >
      <div
        className={cn(
          '[display:flex]',
          '[gap:14px]',
          '[align-items:flex-start]',
          '[margin-bottom:18px]',
        )}
      >
        <div
          className={cn(
            '[width:42px]',
            '[height:42px]',
            '[border-radius:14px]',
            '[background:linear-gradient(135deg,_#00d7ff_0%,_#0ea5e9_100%)]',
            '[color:#042f3a]',
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:center]',
            '[flex-shrink:0]',
            '[box-shadow:0_10px_24px_rgba(14,165,233,.18)]',
          )}
        >
          <Users size={18} />
        </div>
        <div>
          <h3
            className={cn(
              '[font-size:20px]',
              '[font-weight:800]',
              '[color:#111827]',
              '[margin-bottom:6px]',
              '[margin-top:0]',
            )}
          >
            Target Audience
          </h3>
          <p
            className={cn(
              '[margin:0]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[line-height:var(--line-height-body)]',
            )}
          >
            Keep your messaging focused on the people you actually want to reach.
          </p>
        </div>
      </div>
      <div
        className={cn(
          '[display:grid]',
          '[grid-template-columns:repeat(auto-fit,_minmax(260px,_1fr))]',
          '[gap:16px]',
        )}
      >
        <div className={cn('[display:flex]', '[flex-direction:column]', '[grid-column:1_/_-1]')}>
          <Textarea
            value={formData.target_audience}
            onChange={(e) => handleInputChange('target_audience', e.target.value)}
            placeholder="Describe your ideal customers..."
            label={<>Target Audience Description</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <NativeSelect
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            label={<>Primary Gender</>}
          >
            {genderOptions.map((gender) => (
              <option key={gender.value} value={gender.value}>
                {gender.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="text"
            value={formData.business_location}
            onChange={(e) => handleInputChange('business_location', e.target.value)}
            placeholder="City, State/Country"
            label={<>Business Location</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]', '[grid-column:1_/_-1]')}>
          <label
            className={cn(
              '[font-size:13px]',
              '[font-weight:700]',
              '[color:var(--text-secondary)]',
              '[margin-bottom:8px]',
            )}
          >
            Target Locations
          </label>
          <div
            className={cn(
              '[display:grid]',
              '[grid-template-columns:repeat(auto-fit,_minmax(210px,_1fr))]',
              '[gap:12px]',
            )}
          >
            {[
              'Local (Same City)',
              'Regional (Same State/Province)',
              'National',
              'International',
            ].map((loc) => (
              <label
                key={loc}
                className={cn(
                  '[display:flex]',
                  '[align-items:center]',
                  '[gap:8px]',
                  '[padding:12px_14px]',
                  '[border-radius:16px]',
                  '[border:1px_solid_var(--border-default)]',
                  '[background:var(--surface-card)]',
                  '[font-size:14px]',
                  '[cursor:pointer]',
                  '[color:var(--text-secondary)]',
                  '[font-weight:600]',
                  '[-webkit-tap-highlight-color:transparent]',
                  formData.target_locations.includes(loc)
                    ? cn('[border:1px_solid_#7dd3fc]', '[background:#ecfeff]')
                    : cn(),
                )}
              >
                <input
                  type="checkbox"
                  checked={formData.target_locations.includes(loc)}
                  onChange={() => handleLocationToggle(loc)}
                  className={cn('[margin:0]', '[accent-color:var(--brand-primary)]')}
                />

                <span>{loc}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
