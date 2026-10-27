/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * MarketplacePage — public agency browse.
 *
 * Reachable at /agencies (public) and /u/agency/find (linked from end-user shell).
 * Anyone — logged in or not — can browse. Logged-in end-users get an
 * "Invite this agency" CTA on each profile.
 */
import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLink as Link, useAppSearchParams as useSearchParams } from '../../core/navigation';
import {
  Search, ShieldCheck, Sparkles, Star, Filter, Building2, ChevronRight, MapPin,
} from 'lucide-react';

import { marketplaceAPI } from '@/services/domains/accounts';
import { apiError } from '@/services/http/errors';
import Button from '@/components/ui/Button';
import DataState from '@/components/ui/DataState';

const SORT_OPTIONS = [
  { value: 'relevance', label: "مرتبط‌ترین" },
  { value: 'rating',    label: "دارای رتبه برتر" },
  { value: 'newest',    label: "جدیدترین" },
  { value: 'cheapest',  label: "بهترین قیمت" },
];

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const resultHeading = useRef(null);

  const filters = useMemo(() => ({
    q:        searchParams.get('q')        || '',
    industry: searchParams.get('industry') || '',
    service:  searchParams.get('service')  || '',
    verified: searchParams.get('verified') === '1',
    rating_min: searchParams.get('rating_min') || '',
    sort:     searchParams.get('sort') || 'relevance',
  }), [searchParams]);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === '') next.delete(key);
    else next.set(key, String(value));
    setSearchParams(next);
  }

  // A filter is a distinct request identity. TanStack Query cancels obsolete
  // reads with AbortSignal and never projects their late results into a new key.
  const list = useQuery({
    queryKey: ['marketplace.agencies', filters.q, filters.industry, filters.service,
      filters.verified, filters.rating_min, filters.sort],
    queryFn: async ({ signal }) => {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v === true ? '1' : v; });
      const response = await marketplaceAPI.list(params, signal);
      const data = response?.data;
      if (!data || !Array.isArray(data.agencies) ||
          !Number.isSafeInteger(data.count) || data.count < 0) {
        throw new Error('Invalid marketplace listing response');
      }
      return data;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const featuredQuery = useQuery({
    queryKey: ['marketplace.featured'],
    queryFn: async ({ signal }) => {
      const data = (await marketplaceAPI.featured(signal))?.data;
      if (!data || !Array.isArray(data.agencies)) throw new Error('Invalid featured agencies response');
      return data.agencies;
    },
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ['marketplace.categories'],
    queryFn: async ({ signal }) => {
      const data = (await marketplaceAPI.categories(signal))?.data;
      if (!data || !Array.isArray(data.industries) || !Array.isArray(data.services)) {
        throw new Error('Invalid marketplace categories response');
      }
      return data;
    },
    retry: false,
  });
  const failure = apiError(list.error);
  const denied = ['authentication', 'permission'].includes(failure.kind);
  const hardFailure = list.isError && (!list.data || denied);
  const agencies = hardFailure ? [] : (list.data?.agencies || []);
  const count = hardFailure ? null : list.data?.count;
  const featured = featuredQuery.data || [];
  const categories = categoriesQuery.data || { industries: [], services: [] };
  const retry = async () => {
    const result = await list.refetch(); // GET only; never retry a mutation.
    if (result.isSuccess) resultHeading.current?.focus();
  };
  const retryAction = <Button variant="secondary" onClick={retry} disabled={list.isFetching}>تلاش دوباره</Button>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-primary-hover)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            بازار خدمات
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            آژانسی متناسب با کسب و کار خود بیابید
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>
            آژانس‌های تایید شده. شما کنترل داده ها، مجوزها و دسترسی خود را حفظ می‌کنید.
          </p>
        </header>

        {/* Search bar */}
        <div style={searchBar}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            value={filters.q}
            aria-label="جست‌وجوی آژانس‌ها"
            onChange={(e) => setFilter('q', e.target.value)}
            placeholder={"آژانس‌ها را بر اساس نام، صنعت یا مکان جستجو کنید"}
            style={searchInput}
          />
          <select
            value={filters.sort}
            aria-label="مرتب‌سازی آژانس‌ها"
            onChange={(e) => setFilter('sort', e.target.value)}
            style={selectStyle}
          >
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Featured */}
        {!list.isPending && !hardFailure && featured.length > 0 &&
          !filters.q && !filters.industry && !filters.service && !filters.verified && !filters.rating_min && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>
              <Sparkles size={14} style={{ color: 'var(--brand-primary-hover)' }} /> برجسته
            </h2>
            <div style={cardGrid}>
              {featured.map((a) => <AgencyCard key={a.id} agency={a} />)}
            </div>
          </section>
        )}

        {/* Filter chips */}
        <section style={{ marginTop: 28 }}>
          <h2 style={sectionTitle}>
            <Filter size={13} style={{ color: 'var(--text-tertiary)' }} /> فیلترها
          </h2>
          {categoriesQuery.isError && <DataState compact state="unavailable"
            title="فیلترهای تکمیلی فعلاً در دسترس نیستند"
            action={<Button variant="secondary" onClick={() => categoriesQuery.refetch()} disabled={categoriesQuery.isFetching}>بارگیری فیلترها</Button>} />}
          <FilterChips
            label={"صنعت"}
            value={filters.industry}
            options={categories.industries}
            onChange={(v) => setFilter('industry', v)}
          />
          <FilterChips
            label={"خدمات"}
            value={filters.service}
            options={categories.services}
            onChange={(v) => setFilter('service', v)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.verified}
                onChange={(e) => setFilter('verified', e.target.checked ? '1' : '')}
              />
              فقط تأیید شده است
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              حداقل امتیاز:
              <select value={filters.rating_min} onChange={(e) => setFilter('rating_min', e.target.value)} style={miniSelect}>
                <option value="">همه</option>
                <option value="3">★ 3+</option>
                <option value="4">★ 4+</option>
                <option value="4.5">★ 4.5+</option>
              </select>
            </label>
          </div>
        </section>

        {/* Results — an HTTP error must never look like an empty search. */}
        <section style={{ marginTop: 28 }}>
          <h2 style={sectionTitle} ref={resultHeading} tabIndex={-1}>
            همه آژانس‌ها {count !== null && count !== undefined &&
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>· {count}</span>}
          </h2>
          {list.isPending ? (
            <DataState state={list.fetchStatus === 'paused' ? 'offline' : 'loading'} title="در حال دریافت آژانس‌ها" />
          ) : hardFailure ? (
            <DataState
              state={denied ? 'forbidden' : failure.status === 404 ? 'not-found' :
                failure.kind === 'unavailable' && typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error'}
              title={denied ? 'دسترسی به این فهرست مجاز نیست' :
                failure.status === 429 ? 'درخواست‌های زیادی ارسال شده است' : 'دریافت فهرست آژانس‌ها ناموفق بود'}
              description="نتیجهٔ خالی تأیید نشده است. اتصال و دسترسی را بررسی کنید و دوباره تلاش کنید."
              referenceId={failure.referenceId}
              action={retryAction}
            />
          ) : (
            <div className="grid gap-3">
              {list.isError && <DataState compact state="stale" title="به‌روزرسانی فهرست ناموفق بود"
                description="نتایج قبلی این جست‌وجو ممکن است قدیمی باشند." action={retryAction} />}
              {list.isFetching && <DataState compact state="refreshing" title="در حال به‌روزرسانی نتایج" />}
              {agencies.length === 0 ? (
                <DataState state="no-results" title="آژانسی مطابق فیلترها پیدا نشد"
                  description="برای مشاهدهٔ نتایج بیشتر، جست‌وجو یا فیلترها را تغییر دهید." />
              ) : (
                <div style={cardGrid}>
                  {agencies.map((a) => <AgencyCard key={a.id} agency={a} />)}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterChips({ label, value, options, onChange }) {
  if (!options || options.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginRight: 4 }}>
        {label}
      </span>
      <Chip active={!value} onClick={() => onChange('')}>همه</Chip>
      {options.map((opt) => (
        <Chip key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.value} <em style={{ fontStyle: 'normal', color: 'var(--text-tertiary)', marginLeft: 4 }}>{opt.count}</em>
        </Chip>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 10px',
        fontSize: 12, fontWeight: active ? 600 : 500,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--brand-primary-soft)' : 'var(--surface-card)',
        border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function AgencyCard({ agency }) {
  return (
    <Link
      to={`/marketplace/${agency.slug}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 16,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        textDecoration: 'none', color: 'inherit',
        transition: 'transform 120ms var(--ease-out), box-shadow 120ms var(--ease-out)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 40, height: 40,
          background: 'var(--brand-primary-glow)', color: 'var(--brand-primary-hover)',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {agency.logo_url
            ? <img src={agency.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
            : <Building2 size={18} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{agency.name}</span>
            {agency.is_verified && <ShieldCheck size={13} color="var(--success)" aria-label={"تأییدشده"} />}
          </div>
          {agency.location && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} /> {agency.location}
            </div>
          )}
        </div>
      </div>

      {agency.description && (
        <p style={{
          margin: 0, fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {agency.description}
        </p>
      )}

      {agency.services_offered?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {agency.services_offered.slice(0, 4).map((s) => (
            <span key={s} style={{
              padding: '2px 8px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-pill)',
              fontSize: 11,
            }}>{s}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
          {agency.review_count > 0 ? (
            <><Star size={12} fill="var(--warning)" stroke="var(--warning)" /> {agency.avg_rating.toFixed(1)} <span style={{ color: 'var(--text-tertiary)' }}>({agency.review_count})</span></>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>هنوز هیچ بررسی وجود ندارد</span>
          )}
        </div>
        {agency.pricing_starting_at && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            از <strong style={{ color: 'var(--text-primary)' }}>{agency.pricing_currency} {Number(agency.pricing_starting_at).toLocaleString('fa-IR')}</strong> در ماه
          </div>
        )}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--brand-primary-hover)' }}>
        مشاهده پروفایل <ChevronRight size={12} />
      </div>
    </Link>
  );
}

const searchBar = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
};

const searchInput = {
  flex: 1, padding: '8px 4px',
  background: 'transparent', border: 'none', outline: 'none',
  fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit',
};

const selectStyle = {
  padding: '6px 10px',
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit',
};

const miniSelect = { ...selectStyle, padding: '4px 8px' };

const sectionTitle = {
  margin: '0 0 8px',
  fontSize: 13, fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

const cardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 14,
};

