/**
 *
 * The invalidation logic in useRealtimeSync depends on the QK factory
 * producing stable, predictable keys. Catch any rename / shape regression
 * here so cache invalidation never silently misses.
 */
import { createQueryClient, QK } from './queryClient';
import { MutationObserver, onlineManager } from '@tanstack/react-query';

describe('QueryClient defaults', () => {
  test('has SPA-tuned defaults applied', () => {
    const opts = createQueryClient().getDefaultOptions();
    expect(opts.queries.staleTime).toBe(30_000);
    expect(opts.queries.gcTime).toBe(5 * 60_000);
    const failure = status => ({ isAxiosError: true, response: { status, data: {}, headers: {} }, message: 'Request failed' });
    expect(opts.queries.retry(0, failure(503))).toBe(true);
    expect(opts.queries.retry(1, failure(503))).toBe(false);
    for (const status of [400,401,403,404,429]) expect(opts.queries.retry(0, failure(status))).toBe(false);
    expect(opts.queries.retry(0, new Error('Malformed response'))).toBe(false);
    expect(opts.queries.refetchOnWindowFocus).toBe(true);
    // Mutations: callers handle retry policy themselves.
    expect(opts.mutations.retry).toBe(0);
    expect(opts.mutations.networkMode).toBe('always');
  });
});

describe('QK key factory', () => {
  test('keys are stable arrays starting with the feature name', () => {
    expect(QK.posts(42)).toEqual(['posts', 42, {}]);
    expect(QK.leads(42)).toEqual(['leads', 42, {}]);
    expect(QK.conversations(42)).toEqual(['conversations', 42, {}]);
    expect(QK.botFlows(42)).toEqual(['bot-flows', 42]);
  });

  test('detail keys are scoped to a single id without client', () => {
    // Detail queries don't need the client in the key — the id is unique.
    expect(QK.post(7)).toEqual(['post', 7]);
    expect(QK.lead(7)).toEqual(['lead', 7]);
    expect(QK.conversation(7)).toEqual(['conversation', 7]);
  });

  test('list keys with filters round-trip via array equality', () => {
    const a = QK.posts(42, { status: 'scheduled' });
    const b = QK.posts(42, { status: 'scheduled' });
    expect(a).toEqual(b);  // structural equality is what React Query uses
  });

  test('different clients produce different keys', () => {
    expect(QK.posts(1)).not.toEqual(QK.posts(2));
    expect(QK.leads(1)).not.toEqual(QK.leads(2));
  });

  test('dashboardCounts and search are present', () => {
    // Used by useDashboardCounts and the future Cmd+K wiring.
    expect(QK.dashboardCounts(42)).toEqual(['dashboard.counts', 42]);
    expect(QK.search(42, 'mumbai')).toEqual(['search', 42, 'mumbai']);
  });
});

test('independent render roots never share query or mutation caches', () => {
  const first = createQueryClient();
  const second = createQueryClient();
  first.setQueryData(QK.posts(42), ['private account data']);
  expect(second.getQueryData(QK.posts(42))).toBeUndefined();
  expect(first.getMutationCache()).not.toBe(second.getMutationCache());
  first.clear();
  second.clear();
});

test('an offline unsafe mutation fails immediately and is never queued for reconnect', async () => {
  const client = createQueryClient();
  const operation = jest.fn().mockRejectedValue(new Error('Network unavailable'));
  const mutation = new MutationObserver(client, { mutationFn: operation });
  const previous = onlineManager.isOnline();
  try {
    onlineManager.setOnline(false);
    await expect(mutation.mutate()).rejects.toThrow('Network unavailable');
    expect(operation).toHaveBeenCalledTimes(1);
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(operation).toHaveBeenCalledTimes(1);
  } finally { onlineManager.setOnline(previous); client.clear(); }
});
