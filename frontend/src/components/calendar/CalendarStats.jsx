/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { PLATFORMS } from '../../services/platforms';
import HeatmapCalendar from './HeatmapCalendar';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { useLanguage } from '../../i18n';

const PLATFORM_COLORS = Object.fromEntries(
  Object.entries(PLATFORMS).map(([key, value]) => [key, value.color])
);

const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function StatCard({ children, style }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const node = ref.current;
    node.style.opacity = '0';
    node.style.transform = 'translateY(10px)';
    const timer = setTimeout(() => {
      node.style.transition = 'opacity 0.3s, transform 0.3s';
      node.style.opacity = '1';
      node.style.transform = 'translateY(0)';
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} style={{
      background: 'var(--surface-card)', borderRadius: 12,
      border: '1px solid var(--border-default)', padding: '18px 20px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)',
      textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

export default function CalendarStats({
  stats, month, year, currentDate, rangeStart, rangeEnd, postsByDate,
}) {
  const { isPersian, tr, formatDate, formatNumber } = useLanguage();

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)', fontSize: 14 }}>
        {tr('No stats available for this period.')}
      </div>
    );
  }

  const monthAnchor = currentDate || new Date(year, (month || 1) - 1, 1);
  const monthName = formatDate(monthAnchor, { month: 'long', ...(isPersian ? { year: 'numeric' } : {}) });

  const platformData = Object.entries(stats.by_platform || {}).map(([key, value]) => ({
    name: PLATFORMS[key]?.label || key,
    value,
    color: PLATFORM_COLORS[key] || '#64748B',
    key,
  }));

  const dowData = DOW_ORDER.map(day => ({
    key: day,
    day: isPersian ? tr(day) : day.slice(0, 3),
    count: stats.by_day_of_week?.[day] || 0,
  }));
  const bestDow = dowData.reduce((best, item) => item.count > best.count ? item : best, dowData[0]);
  const hasDayData = dowData.some(item => item.count > 0);

  const typeData = Object.entries(stats.by_post_type || {}).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(...typeData.map(([, value]) => value), 1);

  const gaps = stats.posting_gaps || [];
  let maxConsecutive = gaps.length ? 1 : 0;
  let current = gaps.length ? 1 : 0;
  for (let index = 1; index < gaps.length; index += 1) {
    const prev = new Date(`${gaps[index - 1]}T12:00:00`);
    const next = new Date(`${gaps[index]}T12:00:00`);
    const diff = Math.round((next - prev) / 86400000);
    current = diff === 1 ? current + 1 : 1;
    maxConsecutive = Math.max(maxConsecutive, current);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
      <StatCard>
        <CardTitle>{tr('Posting Frequency')}</CardTitle>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          {formatNumber(stats.total_published || 0)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          {tr('posts published in')} {monthName} · ~{formatNumber(stats.avg_per_week || 0)}/{tr('week')}
        </div>
        <HeatmapCalendar
          month={month}
          year={year}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          postsByDate={postsByDate}
        />
      </StatCard>

      <StatCard>
        <CardTitle>{tr('Posts by Platform')}</CardTitle>
        {platformData.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{tr('No data')}</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {platformData.map(entry => <Cell key={entry.key} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {platformData.map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <SocialPlatformIcon platform={item.key} size={14} />
                    {item.name}: <strong>{formatNumber(item.value)}</strong>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </StatCard>

      <StatCard>
        <CardTitle>{tr('Posts by Day of Week')}</CardTitle>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={dowData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'var(--surface-sunken)' }} formatter={value => formatNumber(value)} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {dowData.map(item => (
                <Cell key={item.key} fill={hasDayData && item.key === bestDow.key ? '#10B981' : '#2563EB'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {hasDayData && (
          <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginTop: 6 }}>
            🏆 {tr('Best day')}: {bestDow.day}
          </div>
        )}
      </StatCard>

      <StatCard>
        <CardTitle>{tr('Posts by Type')}</CardTitle>
        {typeData.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{tr('No data')}</div>
        ) : (
          <div>
            {typeData.map(([type, count]) => (
              <div key={type} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>{tr(type)}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{formatNumber(count)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${(count / maxType) * 100}%`,
                    background: '#2563EB', transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </StatCard>

      <StatCard>
        <CardTitle>🏆 {tr('Best Performing Post')}</CardTitle>
        {!stats.best_performing_post ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{tr('No published posts yet.')}</div>
        ) : (() => {
          const best = stats.best_performing_post;
          const platform = PLATFORMS[best.platform] || { color: '#64748B', label: best.platform };
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <SocialPlatformIcon platform={best.platform} size={22} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{platform.label}</div>
                  {best.published_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {formatDate(best.published_at, { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
              {best.caption && (
                <div style={{
                  fontSize: 12, color: 'var(--text-secondary)', background: 'var(--surface-sunken)',
                  borderRadius: 6, padding: '8px 10px', marginBottom: 10,
                  lineHeight: 'var(--line-height-body)',
                }}>
                  {best.caption.slice(0, 120)}{best.caption.length > 120 ? '…' : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, marginBottom: 10 }}>
                {[
                  ['👁', best.impressions],
                  ['📡', best.reach],
                  ['❤️', best.likes],
                ].map(([icon, value]) => (
                  <span key={icon} style={{ color: 'var(--text-secondary)' }}>
                    {icon} {formatNumber(value || 0)}
                  </span>
                ))}
              </div>
              {best.post_url && (
                <a
                  href={best.post_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: platform.color, fontWeight: 600, textDecoration: 'none' }}
                >
                  {tr('View Post')} {isPersian ? '←' : '→'}
                </a>
              )}
            </div>
          );
        })()}
      </StatCard>

      <StatCard>
        <CardTitle>{tr('Posting Gaps')}</CardTitle>
        {gaps.length === 0 ? (
          <div style={{ color: '#10B981', fontSize: 13, fontWeight: 600 }}>
            ✅ {tr('No gaps — great consistency!')}
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 24, fontWeight: 800, color: maxConsecutive >= 3 ? '#EF4444' : '#F59E0B',
              marginBottom: 4,
            }}>
              {formatNumber(gaps.length)} {tr(gaps.length === 1 ? 'day' : 'days')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              {tr('with no posts in')} {monthName}
              {maxConsecutive >= 3 && (
                <span style={{ color: '#EF4444', marginInlineStart: 6, fontWeight: 600 }}>
                  · {formatNumber(maxConsecutive)} {tr('consecutive days')}
                </span>
              )}
            </div>
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {gaps.slice(0, 15).map(date => (
                <div key={date} style={{
                  display: 'inline-block', margin: '2px 3px',
                  padding: '2px 8px', borderRadius: 20,
                  background: '#FEF2F2', color: '#EF4444',
                  fontSize: 11, fontWeight: 600,
                }}>
                  {formatDate(`${date}T12:00:00`, { month: 'short', day: 'numeric' })}
                </div>
              ))}
              {gaps.length > 15 && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  + {formatNumber(gaps.length - 15)} {tr('more')}
                </div>
              )}
            </div>
          </>
        )}
      </StatCard>
    </div>
  );
}
