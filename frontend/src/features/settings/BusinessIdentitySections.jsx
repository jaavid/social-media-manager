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

import { Building2, Palette } from 'lucide-react';

export function renderBusinessBasics({ formData, handleInputChange }) {
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
          <Building2 size={18} />
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
            Business Basics
          </h3>
          <p
            className={cn(
              '[margin:0]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[line-height:var(--line-height-body)]',
            )}
          >
            The details that anchor your workspace and keep your business identity consistent.
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
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            label={<>Your Name</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="text"
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Your company name"
            label={
              <>
                Business Name{' '}
                <span
                  className={cn(
                    'text-destructive',
                    '[margin-inline-start:2px]',
                    '[font-weight:800]',
                  )}
                >
                  *
                </span>
              </>
            }
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="business@email.com"
            label={<>Email</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            label={<>Phone Number</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="tel"
            value={formData.whatsapp_number}
            onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
            placeholder="+1 (555) 123-4567"
            label={<>WhatsApp Number</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <Input
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://yourwebsite.com"
            label={<>Website</>}
          />
        </div>
      </div>
    </div>
  );
}

export function renderBrandProfile({
  formData,
  handleInputChange,
  businessCategoryOptions,
  brandToneOptions,
  getSubcategoriesForCategory,
  handleSubcategoryToggle,
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
          <Palette size={18} />
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
            Brand Profile
          </h3>
          <p
            className={cn(
              '[margin:0]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[line-height:var(--line-height-body)]',
            )}
          >
            Define tone, category, and the story your content should always reinforce.
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
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <NativeSelect
            value={formData.business_category}
            onChange={(e) => handleInputChange('business_category', e.target.value)}
            label={<>Business Category</>}
          >
            <option value="">Select category</option>
            {businessCategoryOptions.map((item) => (
              <option key={item.key} value={item.label}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]')}>
          <NativeSelect
            value={formData.brand_tone}
            onChange={(e) => handleInputChange('brand_tone', e.target.value)}
            label={<>Brand Tone</>}
          >
            <option value="">Select tone</option>
            {brandToneOptions.map((tone) => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {formData.business_category &&
          getSubcategoriesForCategory(formData.business_category).length > 0 && (
            <div
              className={cn('[display:flex]', '[flex-direction:column]', '[grid-column:1_/_-1]')}
            >
              <label
                className={cn(
                  '[font-size:13px]',
                  '[font-weight:700]',
                  '[color:var(--text-secondary)]',
                  '[margin-bottom:8px]',
                )}
              >
                Subcategories (select all that apply)
              </label>
              <div
                className={cn(
                  '[display:grid]',
                  '[grid-template-columns:repeat(auto-fit,_minmax(210px,_1fr))]',
                  '[gap:12px]',
                )}
              >
                {getSubcategoriesForCategory(formData.business_category).map((sub) => (
                  <label
                    key={sub}
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
                      formData.business_subcategories.includes(sub)
                        ? cn('[border:1px_solid_#7dd3fc]', '[background:#ecfeff]')
                        : cn(),
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.business_subcategories.includes(sub)}
                      onChange={() => handleSubcategoryToggle(sub)}
                      className={cn('[margin:0]', '[accent-color:var(--brand-primary)]')}
                    />

                    <span>{sub}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        <div className={cn('[display:flex]', '[flex-direction:column]', '[grid-column:1_/_-1]')}>
          <Textarea
            value={formData.brand_description}
            onChange={(e) => handleInputChange('brand_description', e.target.value)}
            placeholder="Describe your brand in 2-3 sentences..."
            label={<>Brand Description</>}
          />
        </div>
        <div className={cn('[display:flex]', '[flex-direction:column]', '[grid-column:1_/_-1]')}>
          <Textarea
            value={formData.usp}
            onChange={(e) => handleInputChange('usp', e.target.value)}
            placeholder="What makes your business unique?"
            label={<>Unique Selling Proposition (USP)</>}
          />
        </div>
      </div>
    </div>
  );
}
