/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useMemo, useEffect, useRef } from 'react';
import { eachDayOfInterval, format, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '../../i18n';

const INTENSITY_COLORS = ['#F1F5F9', '#BFDBFE', '#60A5FA', '#2563EB'];

function getColor(count) {
  if (count === 0) return INTENSITY_COLORS[0];
  if (count === 1) return INTENSITY_COLORS[1];
  if (count === 2) return INTENSITY_COLORS[2];
  return INTENSITY_COLORS[3];
}

export default function HeatmapCalendar({ month, year, postsByDate, rangeStart, rangeEnd }) {
  const containerRef = useRef(null);
  const { isPersian, tr, formatDate, formatNumber } = useLanguage();

  const days = useMemo(() => {
    if (isPersian && rangeStart && rangeEnd) {
      return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    }
    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [isPersian, rangeStart, rangeEnd, month, year]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const timers = [];
    const squares = containerRef.current.querySelectorAll('.hm-sq');
    squares.forEach((square, index) => {
      square.style.opacity = '0';
      square.style.transform = 'scale(0.5)';
      const timer = setTimeout(() => {
        square.style.opacity = '1';
        square.style.transform = 'scale(1)';
        square.style.transition = 'opacity 0.2s, transform 0.2s';
      }, index * 12);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [days, postsByDate]);

  return (
    <div ref={containerRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const count = (postsByDate[dateStr] || []).length;
        const color = getColor(count);
        const dayLabel = isPersian
          ? formatDate(day, { month: 'short', day: 'numeric' })
          : format(day, 'MMM d');
        return (
          <div
            key={dateStr}
            className="hm-sq"
            title={`${dayLabel}: ${formatNumber(count)} ${tr(count === 1 ? 'post' : 'posts')}`}
            style={{
              width: 12, height: 12,
              borderRadius: 2,
              background: color,
              cursor: 'default',
            }}
          />
        );
      })}
      <div style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: 6, marginTop: 8, fontSize: 10, color: '#64748B',
      }}>
        <span>{tr('Less')}</span>
        {INTENSITY_COLORS.map(color => (
          <div key={color} style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
        ))}
        <span>{tr('More')}</span>
      </div>
    </div>
  );
}
