import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgencyProfilePage from './AgencyProfilePage';
import { marketplaceAPI, reviewAPI } from '@/services/domains/accounts';

let mockSlug = 'alpha';
jest.mock('../../core/navigation', () => ({
  useAppParams: () => ({ slug: mockSlug }),
  AppLink: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
jest.mock('../../core/session', () => ({ useSession: () => ({ user: { id: 1, role: 'client' } }) }));
jest.mock('@/services/domains/accounts', () => ({
  marketplaceAPI: { get: jest.fn() },
  reviewAPI: {
    list: jest.fn(), helpful: jest.fn(), delete: jest.fn(), respond: jest.fn(),
  },
}));
jest.mock('../../components/marketplace/InviteAgencyModal', () => () => null);
jest.mock('../../components/marketplace/WriteReviewModal', () => () => null);
jest.mock('../../components/ui/toast', () => ({ error: jest.fn(), success: jest.fn() }));
jest.mock('../../components/ui/Button', () => function MockButton({ children, onClick }) { return <button onClick={onClick}>{children}</button>; });
jest.mock('../../components/ui/DataState', () => function MockDataState({ title, state, action }) {
  return <div role={['error', 'forbidden', 'not-found'].includes(state) ? 'alert' : 'status'}>{title}{action}</div>;
});

const agency = (slug, name) => ({ slug, name, review_count: 0, services_offered: [], industries_served: [] });
const resolveAgency = (slug, name) => ({ data: agency(slug, name) });
const pending = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const failure = status => ({
  isAxiosError: true,
  response: { status, headers: {}, data: { detail: 'Sensitive private details' } },
});
let view;
const mount = () => { view = render(<AgencyProfilePage />); };
beforeEach(() => {
  jest.resetAllMocks();
  mockSlug = 'alpha';
  reviewAPI.list.mockResolvedValue({ data: { rows: [], count: 0 } });
});
afterEach(() => { view?.unmount(); view = null; });

test.each([401, 403, 404, 429, 503])('agency detail GET failure %i has safe recovery, no private payload', async status => {
  marketplaceAPI.get.mockRejectedValueOnce(failure(status))
    .mockResolvedValueOnce(resolveAgency('alpha', 'Recovered agency'));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    [401, 403].includes(status) ? 'دسترسی به این پروفایل مجاز نیست' :
      status === 404 ? 'پروفایل آژانس پیدا نشد' : 'دریافت پروفایل آژانس ناموفق بود'
  );
  expect(screen.queryByText('Sensitive private details')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
  expect(await screen.findByRole('heading', { name: 'Recovered agency' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Recovered agency' })).toHaveFocus());
  expect(marketplaceAPI.get).toHaveBeenCalledTimes(2);
  expect(marketplaceAPI.get.mock.calls.every(([slug, signal]) => slug === 'alpha' && signal instanceof AbortSignal)).toBe(true);
});

test('invalid 200 response remains an error rather than claiming a profile exists', async () => {
  marketplaceAPI.get.mockResolvedValueOnce({ data: { slug: 'someone-else', name: 'Wrong agency' } });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('دریافت پروفایل آژانس ناموفق بود');
  expect(screen.queryByText('Wrong agency')).not.toBeInTheDocument();
});

test('slug switch synchronously hides old details, aborts old read and ignores late response', async () => {
  const old = pending();
  marketplaceAPI.get.mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(resolveAgency('beta', 'Correct agency'));
  mount();
  await waitFor(() => expect(marketplaceAPI.get).toHaveBeenCalledTimes(1));
  const signal = marketplaceAPI.get.mock.calls[0][1];
  mockSlug = 'beta'; view.rerender(<AgencyProfilePage />);
  expect(await screen.findByRole('heading', { name: 'Correct agency' })).toBeInTheDocument();
  expect(signal.aborted).toBe(true);
  await act(async () => old.resolve(resolveAgency('alpha', 'Confidential previous agency')));
  expect(screen.queryByText('Confidential previous agency')).not.toBeInTheDocument();
});

test('reviews from prior slug are aborted and cannot become new agency reviews', async () => {
  const oldReviews = pending();
  marketplaceAPI.get.mockImplementation(slug => Promise.resolve(resolveAgency(slug, slug === 'alpha' ? 'Alpha agency' : 'Beta agency')));
  reviewAPI.list.mockReturnValueOnce(oldReviews.promise).mockResolvedValueOnce({
    data: { rows: [], count: 0 },
  });
  mount(); await screen.findByRole('heading', { name: 'Alpha agency' });
  await waitFor(() => expect(reviewAPI.list).toHaveBeenCalledTimes(1));
  const signal = reviewAPI.list.mock.calls[0][2];
  mockSlug = 'beta'; view.rerender(<AgencyProfilePage />);
  await screen.findByRole('heading', { name: 'Beta agency' });
  expect(signal.aborted).toBe(true);
  await act(async () => oldReviews.resolve({ data: { count: 1, rows: [{ id: 9, body: 'Previous private review' }] } }));
  expect(screen.queryByText('Previous private review')).not.toBeInTheDocument();
});

test('failed review read never claims there are zero reviews and can retry safely', async () => {
  marketplaceAPI.get.mockResolvedValue(resolveAgency('alpha', 'Agency with reviews'));
  reviewAPI.list.mockRejectedValueOnce(new Error('network unavailable'))
    .mockResolvedValueOnce({ data: { rows: [], count: 0 } });
  mount();
  await screen.findByRole('heading', { name: 'Agency with reviews' });
  expect(await screen.findByText('نظرهای این آژانس در دسترس نیست')).toBeInTheDocument();
  expect(screen.queryByText(/هنوز نظری وجود ندارد/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
  expect(await screen.findByText(/هنوز نظری وجود ندارد/)).toBeInTheDocument();
  expect(reviewAPI.list).toHaveBeenCalledTimes(2);
  expect(reviewAPI.list.mock.calls.every(([slug, , signal]) => slug === 'alpha' && signal instanceof AbortSignal)).toBe(true);
});
