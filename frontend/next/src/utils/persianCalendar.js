const partsFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric',
});

export function persianParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map(p => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function localNoon(value) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function startOfPersianMonth(value) {
  const date = localNoon(value);
  const { day } = persianParts(date);
  date.setDate(date.getDate() - (day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addPersianMonths(value, amount) {
  let cursor = startOfPersianMonth(value);
  const direction = amount >= 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(amount); i += 1) {
    const probe = new Date(cursor);
    probe.setDate(probe.getDate() + (direction > 0 ? 32 : -1));
    cursor = startOfPersianMonth(probe);
  }
  return cursor;
}

export function endOfPersianMonth(value) {
  const next = addPersianMonths(value, 1);
  next.setDate(next.getDate() - 1);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function isSamePersianMonth(a, b) {
  const pa = persianParts(a);
  const pb = persianParts(b);
  return pa.year === pb.year && pa.month === pb.month;
}

export function persianMonthRange(value) {
  return { start: startOfPersianMonth(value), end: endOfPersianMonth(value) };
}

export function gregorianMonthsCovering(start, end) {
  const result = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    result.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export function isoDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateKeyInRange(key, start, end) {
  const date = new Date(`${key}T12:00:00`);
  return date >= start && date <= end;
}
