import { api } from '@/services/http/client';
import type { ConnectedAccount } from '@/services/domains/connections';
export interface MetricDescriptor { key: string; title_en: string; title_fa: string; unit: string; period: string }
export interface ReportFilters { social_account: number; since: string; until: string; page: number }
export interface AnalyticsReport {
  version: 1; workspace_id: number; account_id: number; provider: string;
  dataset_count: number;
  availability: 'available' | 'unavailable'; period: { since: string; until: string };
  metrics: MetricDescriptor[]; sync: ConnectedAccount['sync'];
  rows: { id: number; date: string; observed_at: string; state: 'available' | 'partial' | 'unknown'; values: Record<string, number | null> }[];
  pagination: { page: number; page_size: number; count: number; has_next: boolean; has_previous: boolean };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function parseReport(wire: unknown, workspace: number, filters: ReportFilters): AnalyticsReport {
  if (!object(wire) || wire.version !== 1 || wire.workspace_id !== workspace || wire.account_id !== filters.social_account
    || typeof wire.provider !== 'string' || !['available', 'unavailable'].includes(String(wire.availability))
    || !object(wire.period) || wire.period.since !== filters.since || wire.period.until !== filters.until
    || !Array.isArray(wire.metrics) || !wire.metrics.every(m => object(m) && typeof m.key === 'string'
      && /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(m.key) && typeof m.title_en === 'string' && typeof m.title_fa === 'string'
      && ['count', 'minutes', 'seconds', 'ratio', 'percent'].includes(String(m.unit)) && ['day', 'snapshot'].includes(String(m.period)))
    || !object(wire.sync) || !['unknown', 'not_available', 'pending', 'fresh', 'stale', 'failure'].includes(String(wire.sync.state))
    || ![wire.sync.last_success_at, wire.sync.last_failure_at, wire.sync.last_attempt_at].every(v => v === null || date(v))
    || typeof wire.sync.stale_after_seconds !== 'number' || wire.sync.stale_after_seconds < 60
    || typeof wire.dataset_count !== 'number' || !Number.isSafeInteger(wire.dataset_count) || wire.dataset_count < 0
    || !object(wire.pagination) || wire.pagination.page !== filters.page || typeof wire.pagination.count !== 'number'
    || !Number.isSafeInteger(wire.pagination.count) || wire.pagination.count < 0
    || typeof wire.pagination.page_size !== 'number' || wire.pagination.page_size < 1
    || typeof wire.pagination.has_next !== 'boolean' || typeof wire.pagination.has_previous !== 'boolean'
    || !Array.isArray(wire.rows)) throw new Error('Invalid analytics report');
  const keys = wire.metrics.map(m => m.key as string);
  if (new Set(keys).size !== keys.length || (wire.availability === 'unavailable' && (keys.length || wire.rows.length))
    || wire.rows.some(row => !object(row) || !Number.isSafeInteger(row.id) || !date(row.date) || String(row.date) < filters.since || String(row.date) > filters.until || !date(row.observed_at)
      || !['available', 'partial', 'unknown'].includes(String(row.state)) || !object(row.values)
      || Object.keys(row.values).length !== keys.length
      || keys.some(key => !(key in (row.values as Record<string, unknown>)) || ((row.values as Record<string, unknown>)[key] !== null
        && (typeof (row.values as Record<string, unknown>)[key] !== 'number' || !Number.isFinite((row.values as Record<string, unknown>)[key])))))) {
    throw new Error('Invalid analytics rows');
  }
  return wire as unknown as AnalyticsReport;
}
const path = (workspace: number) => `/workspaces/${workspace}/analytics_report/`;
export const analyticsReports = {
  async get(workspace: number, filters: ReportFilters, signal?: AbortSignal) {
    const response = await api.get<unknown>(path(workspace), { params: filters, signal });
    return parseReport(response.data, workspace, filters);
  },
  async export(workspace: number, filters: ReportFilters) {
    const response = await api.get<Blob>(path(workspace), { params: { ...filters, page: 1, export: 'csv' }, responseType: 'blob' });
    if (!String(response.headers['content-type']).startsWith('text/csv')) throw new Error('Invalid analytics export');
    return response.data;
  },
};
