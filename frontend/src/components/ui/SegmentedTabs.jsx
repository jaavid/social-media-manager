/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Tabs from './Tabs';
import { useLanguage } from '../../i18n';
export default function SegmentedTabs({ items = [], active, onChange, compact = false, fullWidth = false, style, className }) {
  const { tr } = useLanguage();
  return <Tabs tabs={items.map(item => ({ value: item.id, disabled: item.disabled, label: <>{item.icon}{typeof item.label === 'string' ? tr(item.label) : item.label}{item.trailing}</> }))}
    value={active} onChange={onChange} size={compact ? 'sm' : 'md'} fullWidth={fullWidth} style={style} className={className} />;
}
