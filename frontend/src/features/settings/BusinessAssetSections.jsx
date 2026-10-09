/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { cn } from '@/lib/utils';

import CompetitorSection from '@/components/ui/CompetitorSection';

import { ImagePlus, Upload, X } from 'lucide-react';

export function renderBrandAssets({ handleFileUpload, formData, removeFile, t }) {
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
          <ImagePlus size={18} />
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
            Brand Assets
          </h3>
          <p
            className={cn(
              '[margin:0]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[line-height:var(--line-height-body)]',
            )}
          >
            Use the same asset experience from onboarding so brand visuals stay organized.
          </p>
        </div>
      </div>
      <div className={cn('[display:grid]', '[gap:18px]')}>
        <div
          className={cn(
            '[display:grid]',
            '[gap:14px]',
            '[padding:22px]',
            '[border-radius:22px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
          )}
        >
          <div
            className={cn('[font-size:18px]', '[font-weight:800]', '[color:var(--text-primary)]')}
          >
            Profile Image
          </div>
          <div
            className={cn(
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[line-height:var(--line-height-body)]',
            )}
          >
            Upload a logo or a strong profile mark for your brand.
          </div>
          <div className={cn('[display:grid]', '[gap:12px]')}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload('profile_image', e.target.files)}
              id="settings-profile-image"
              className={cn('[display:none]')}
            />

            <label
              htmlFor="settings-profile-image"
              className={cn(
                '[display:inline-flex]',
                '[align-items:center]',
                '[gap:8px]',
                '[padding:14px_16px]',
                '[border-radius:16px]',
                '[border:2px_dashed_#bae6fd]',
                '[background:linear-gradient(180deg,_#f8fdff_0%,_#effbff_100%)]',
                '[color:#0369a1]',
                '[cursor:pointer]',
                '[font-size:14px]',
                '[font-weight:700]',
              )}
            >
              <Upload size={16} />
              Choose Profile Image
            </label>
            {formData.profile_image && (
              <div className={cn('[position:relative]', '[display:inline-block]')}>
                <img
                  src={URL.createObjectURL(formData.profile_image)}
                  alt="Profile"
                  className={cn(
                    '[width:120px]',
                    '[height:120px]',
                    '[object-fit:cover]',
                    '[border-radius:14px]',
                    '[border:1px_solid_var(--border-default)]',
                  )}
                />
                <button
                  onClick={() => removeFile('profile_image')}
                  className={cn(
                    '[position:absolute]',
                    '[top:-6px]',
                    '[inset-inline-end:-6px]',
                    '[width:22px]',
                    '[height:22px]',
                    '[border-radius:50%]',
                    '[background:#ef4444]',
                    '[color:var(--surface-card)]',
                    '[border:none]',
                    '[cursor:pointer]',
                    '[display:flex]',
                    '[align-items:center]',
                    '[justify-content:center]',
                  )}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            '[display:grid]',
            '[gap:14px]',
            '[padding:22px]',
            '[border-radius:22px]',
            '[background:linear-gradient(180deg,_var(--surface-sunken)_0%,_#fbfdff_100%)]',
            '[border:1px_solid_var(--border-default)]',
          )}
        >
          <div
            className={cn('[font-size:18px]', '[font-weight:800]', '[color:var(--text-primary)]')}
          >
            Product Images
          </div>
          <div
            className={cn(
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[line-height:var(--line-height-body)]',
            )}
          >
            Keep a few product or service visuals handy for creative generation later.
          </div>
          <p id="business-upload-limit" className="text-sm">
            {t('business.uploadLimit')}
          </p>
          <div className={cn('[display:grid]', '[gap:12px]')}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload('product_images', e.target.files)}
              disabled
              aria-describedby="business-upload-limit"
              id="settings-product-images"
              className={cn('[display:none]')}
            />

            <label
              htmlFor="settings-product-images"
              className={cn(
                '[display:inline-flex]',
                '[align-items:center]',
                '[gap:8px]',
                '[padding:14px_16px]',
                '[border-radius:16px]',
                '[border:2px_dashed_#bae6fd]',
                '[background:linear-gradient(180deg,_#f8fdff_0%,_#effbff_100%)]',
                '[color:#0369a1]',
                '[cursor:pointer]',
                '[font-size:14px]',
                '[font-weight:700]',
              )}
            >
              <Upload size={16} />
              Choose Product Images
            </label>
            <div
              className={cn(
                '[display:grid]',
                '[grid-template-columns:repeat(auto-fit,_minmax(120px,_1fr))]',
                '[gap:12px]',
              )}
            >
              {formData.product_images.map((file, index) => (
                <div key={index} className={cn('[position:relative]', '[display:inline-block]')}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Product ${index + 1}`}
                    className={cn(
                      '[width:120px]',
                      '[height:120px]',
                      '[object-fit:cover]',
                      '[border-radius:14px]',
                      '[border:1px_solid_var(--border-default)]',
                    )}
                  />
                  <button
                    onClick={() => removeFile('product_images', index)}
                    className={cn(
                      '[position:absolute]',
                      '[top:-6px]',
                      '[inset-inline-end:-6px]',
                      '[width:22px]',
                      '[height:22px]',
                      '[border-radius:50%]',
                      '[background:#ef4444]',
                      '[color:var(--surface-card)]',
                      '[border:none]',
                      '[cursor:pointer]',
                      '[display:flex]',
                      '[align-items:center]',
                      '[justify-content:center]',
                    )}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function renderCompetitors({
  t,
  formData,
  socialPlatformOptions,
  addCompetitor,
  updateCompetitor,
  removeCompetitor,
  addCompetitorLink,
  updateCompetitorLink,
  removeCompetitorLink,
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
      <p className="text-sm">{t('business.competitorLimit')}</p>
      <fieldset disabled className="min-w-0 border-0 p-0">
        <CompetitorSection
          competitors={formData.competitors}
          socialPlatforms={socialPlatformOptions}
          onAddCompetitor={addCompetitor}
          onUpdateCompetitor={updateCompetitor}
          onRemoveCompetitor={removeCompetitor}
          onAddLink={addCompetitorLink}
          onUpdateLink={updateCompetitorLink}
          onRemoveLink={removeCompetitorLink}
          maxCompetitors={3}
          title="Competitors"
          subtitle="Keep your competitive set tidy and current so reports, ideas, and onboarding stay grounded in the right market context."
        />
      </fieldset>
    </div>
  );
}
