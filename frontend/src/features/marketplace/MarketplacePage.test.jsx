import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarketplacePage from './MarketplacePage';
import { marketplaceAPI } from '@/services/domains/accounts';

let mockSearch;
let mockSetSearch;
jest.mock('@/core/navigation', () => ({
  useAppSearchParams: () => [mockSearch, mockSetSearch],
  AppLink: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
jest.mock('@/services/domains/accounts', () => ({
  marketplaceAPI: { list: jest.fn(), featured: jest.fn(), categories: jest.fn() },
}));

const agency = (id, name) => ({ id, slug: `agency-${id}`, name, review_count: 0 });
const response = (agencies = []) => ({ data: { agencies, count: agencies.length } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let queryClient, view;
const tree = () => <QueryClientProvider client={queryClient}><MarketplacePage /></QueryClientProvider>;
beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = new URLSearchParams();
  mockSetSearch = jest.fn(next => { mockSearch = next; view.rerender(tree()); });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  marketplaceAPI.featured.mockResolvedValue(response());
  marketplaceAPI.categories.mockResolvedValue({ data: { industries: [], services: [] } });
});
afterEach(() => { view?.unmount(); view = null; queryClient.clear(); });
const mount = () => { view = render(tree()); };
const httpFailure = status => ({
  isAxiosError: true,
  response: { status, headers: {}, data: { detail: 'Private diagnostic message' } },
});

test.each([401, 403, 404, 429, 503])('HTTP %i never looks like an empty search; a retry is a GET only', async status => {
  marketplaceAPI.list.mockRejectedValueOnce(httpFailure(status))
    .mockResolvedValueOnce(response([agency(1, 'Agency after recovery')]));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    status === 401 || status === 403 ? 'دسترسی به این فهرست مجاز نیست' : 'دریافت'
  );
  expect(screen.queryByText('آژانسی مطابق فیلترها پیدا نشد')).not.toBeInTheDocument();
  expect(screen.queryByText('Private diagnostic message')).not.toBeInTheDocument();
  expect(marketplaceAPI.list).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
  expect(await screen.findByText('Agency after recovery')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('heading', { name: /همه آژانس‌ها/ })).toHaveFocus());
  expect(marketplaceAPI.list).toHaveBeenCalledTimes(2);
  expect(marketplaceAPI.list.mock.calls.every(([, signal]) => signal instanceof AbortSignal)).toBe(true);
});

test('valid empty results are distinct from API or payload failures', async () => {
  marketplaceAPI.list.mockResolvedValue(response());
  mount();
  expect(await screen.findByText('آژانسی مطابق فیلترها پیدا نشد')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test.each([{ data: [] }, { data: {} }, { data: { agencies: [], count: -1 } }])(
  'invalid response %j is not a confirmed empty search', async value => {
    marketplaceAPI.list.mockResolvedValue(value); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('دریافت فهرست آژانس‌ها ناموفق بود');
    expect(screen.queryByText('آژانسی مطابق فیلترها پیدا نشد')).not.toBeInTheDocument();
  }
);

test('filter changes abort obsolete reads and ignore late foreign results', async () => {
  const old = deferred();
  marketplaceAPI.list.mockImplementation(params => params.q
    ? Promise.resolve(response([agency(2, 'Current filtered agency')]))
    : old.promise);
  mount();
  await waitFor(() => expect(marketplaceAPI.list).toHaveBeenCalledTimes(1));
  const oldSignal = marketplaceAPI.list.mock.calls[0][1];
  fireEvent.change(screen.getByRole('textbox', { name: 'جست‌وجوی آژانس‌ها' }), { target: { value: 'current' } });
  expect(await screen.findByText('Current filtered agency')).toBeInTheDocument();
  await waitFor(() => expect(oldSignal.aborted).toBe(true));
  await act(async () => old.resolve(response([agency(1, 'Foreign stale agency')])));
  expect(screen.queryByText('Foreign stale agency')).not.toBeInTheDocument();
  expect(marketplaceAPI.list.mock.calls[1][0]).toMatchObject({ q: 'current' });
});

test('a recoverable refresh keeps same-filter results with an explicit stale notice', async () => {
  marketplaceAPI.list.mockResolvedValueOnce(response([agency(1, 'Known agency')]))
    .mockRejectedValueOnce(httpFailure(503));
  mount(); await screen.findByText('Known agency');
  await act(async () => { await queryClient.invalidateQueries({ queryKey: ['marketplace.agencies'] }); });
  expect(await screen.findByText('به‌روزرسانی فهرست ناموفق بود')).toBeInTheDocument();
  expect(screen.getByText('Known agency')).toBeInTheDocument();
});

test('denied refresh removes the previous agency cards and counts', async () => {
  marketplaceAPI.list.mockResolvedValueOnce(response([agency(1, 'Private older agency')]))
    .mockRejectedValueOnce(httpFailure(403));
  mount(); await screen.findByText('Private older agency');
  await act(async () => { await queryClient.invalidateQueries({ queryKey: ['marketplace.agencies'] }); });
  expect(await screen.findByRole('alert')).toHaveTextContent('دسترسی به این فهرست مجاز نیست');
  expect(screen.queryByText('Private older agency')).not.toBeInTheDocument();
});
