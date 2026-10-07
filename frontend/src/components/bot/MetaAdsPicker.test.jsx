import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import MetaAdsPicker, { parseMetaRead } from './MetaAdsPicker';
import { metaAdsAPI } from '@/services/domains/accounts';
import { enMessages as mockMessages } from '@/i18n/messages';
jest.mock('@/core/session', () => ({
  useSession: () => ({ user: { id: 1, role: 'client', account_type: 'legacy', workspace_id: 7 } }),
}));
jest.mock('@/services/domains/accounts', () => ({
  metaAdsAPI: { accounts: jest.fn(), campaigns: jest.fn(), ads: jest.fn() },
}));
jest.mock('@/i18n', () => ({
  useLanguage: () => ({ t: (key) => mockMessages[key], tr: (text) => text }),
}));
const wire = (kind, rows, extra = {}) => ({
  data: { connected: true, workspace_id: 7, partial: false, [kind]: rows, ...extra },
});
const accounts = [
  { id: 'act_10', name: 'Account A' },
  { id: 'act_20', name: 'Account B' },
];
const campaign = { id: '11', name: 'Campaign A', account_id: '10' };
const ad = { id: '111', name: 'Ad A', campaign_id: '11', is_ctwa: true };
const selection = { ad_account_id: 'act_10', campaign_ids: ['11'], ad_ids: ['111'] };
const unavailable = {
  isAxiosError: true,
  response: { status: 503, data: { error: 'private credential' } },
};
function setup(value = selection, workspace = 7) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Harness({ scope }) {
    const [current, setCurrent] = useState(value),
      [valid, setValid] = useState(false);
    return (
      <>
        <MetaAdsPicker
          workspaceId={scope}
          value={current}
          onChange={setCurrent}
          onValidityChange={setValid}
        />
        <output data-testid="selection">{JSON.stringify(current)}</output>
        <button disabled={!valid}>Save</button>
      </>
    );
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Harness scope={workspace} />
    </QueryClientProvider>,
  );
  return {
    client,
    ...view,
    switchWorkspace: (scope) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <Harness scope={scope} />
        </QueryClientProvider>,
      ),
  };
}
beforeEach(() => {
  jest.resetAllMocks();
  onlineManager.setOnline(true);
  metaAdsAPI.accounts.mockResolvedValue(wire('accounts', accounts));
  metaAdsAPI.campaigns.mockResolvedValue(
    wire('campaigns', [campaign], { ad_account_id: 'act_10' }),
  );
  metaAdsAPI.ads.mockResolvedValue(
    wire('ads', [ad], { ad_account_id: 'act_10', campaign_id: '11' }),
  );
});
afterEach(() => onlineManager.setOnline(true));
test.each(['accounts', 'campaigns', 'ads'])(
  '%s initial failure is never disconnected or empty and recovers',
  async (kind) => {
    metaAdsAPI[kind].mockRejectedValueOnce(unavailable);
    setup();
    await screen.findByText(mockMessages['meta.unavailable']);
    expect(screen.queryByText(mockMessages['meta.disconnected'])).toBeNull();
    expect(screen.queryByText(mockMessages['meta.empty'])).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    expect(screen.getByTestId('selection')).toHaveTextContent('111');
    expect(screen.queryByText('private credential')).toBeNull();
  },
);
test.each(['accounts', 'campaigns', 'ads'])(
  '%s malformed response remains an error',
  async (kind) => {
    metaAdsAPI[kind].mockResolvedValueOnce({ data: {} });
    setup();
    await screen.findByText(mockMessages['meta.error']);
    expect(screen.queryByText(mockMessages['meta.empty'])).toBeNull();
    expect(screen.queryByText(mockMessages['meta.disconnected'])).toBeNull();
  },
);
test.each(['accounts', 'campaigns', 'ads'])(
  '%s failed refresh keeps verified data and selection',
  async (kind) => {
    const { client } = setup();
    await screen.findByLabelText(/Ad A/);
    metaAdsAPI[kind].mockRejectedValue(unavailable);
    await act(async () =>
      client.invalidateQueries({ predicate: (query) => query.queryKey[3] === kind }),
    );
    await screen.findByText(mockMessages['meta.stale']);
    expect(screen.getByLabelText(/Ad A/)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  },
);
test.each([401, 403, 404, 429, 503])(
  'status %s preserves only authorized cached selection',
  async (status) => {
    const { client } = setup();
    await screen.findByLabelText(/Ad A/);
    metaAdsAPI.ads.mockRejectedValue({ isAxiosError: true, response: { status } });
    await act(async () =>
      client.invalidateQueries({ predicate: (query) => query.queryKey[3] === 'ads' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty(
        'disabled',
        [401, 403, 404].includes(status),
      ),
    );
    if ([401, 403, 404].includes(status)) expect(screen.queryByLabelText(/Ad A/)).toBeNull();
    else expect(screen.getByLabelText(/Ad A/)).toBeChecked();
  },
);
test('late account response is aborted and cannot restore old campaigns', async () => {
  let resolve, signal;
  metaAdsAPI.campaigns.mockImplementationOnce((workspace, account, requestSignal) => {
    signal = requestSignal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  setup();
  await waitFor(() => expect(metaAdsAPI.campaigns).toHaveBeenCalled());
  metaAdsAPI.campaigns.mockResolvedValue(
    wire('campaigns', [{ id: '22', name: 'Campaign B', account_id: '20' }], {
      ad_account_id: 'act_20',
    }),
  );
  fireEvent.change(screen.getByLabelText('Ad accounts'), { target: { value: 'act_20' } });
  await screen.findByLabelText('Campaign B');
  await act(async () => resolve(wire('campaigns', [campaign], { ad_account_id: 'act_10' })));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByLabelText('Campaign A')).toBeNull();
  expect(screen.getByTestId('selection')).not.toHaveTextContent('111');
});
test('workspace switch hides previous data and rejects previous selection', async () => {
  const view = setup();
  await screen.findByLabelText(/Ad A/);
  let resolve;
  metaAdsAPI.accounts.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  view.switchWorkspace(8);
  expect(screen.queryByLabelText(/Ad A/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await act(async () =>
    resolve(wire('accounts', [{ id: 'act_20', name: 'Workspace B' }], { workspace_id: 8 })),
  );
  expect(screen.queryByLabelText(/Ad A/)).toBeNull();
});
test('removing a campaign drops its ads and late ads cannot overwrite current scope', async () => {
  let resolve, signal;
  metaAdsAPI.ads.mockImplementationOnce((w, a, c, s) => {
    signal = s;
    return new Promise((done) => {
      resolve = done;
    });
  });
  setup({ ...selection, ad_ids: [] });
  await screen.findByLabelText('Campaign A');
  await waitFor(() => expect(metaAdsAPI.ads).toHaveBeenCalled());
  fireEvent.click(screen.getByLabelText('Campaign A'));
  await act(async () => resolve(wire('ads', [ad], { ad_account_id: 'act_10', campaign_id: '11' })));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByLabelText(/Ad A/)).toBeNull();
  expect(screen.getByTestId('selection')).not.toHaveTextContent('111');
});
test('offline same-scope refresh retains selection and reconnect safely re-reads', async () => {
  const { client } = setup();
  await screen.findByLabelText(/Ad A/);
  act(() => onlineManager.setOnline(false));
  void client.invalidateQueries();
  await screen.findAllByText(mockMessages['meta.offline']);
  expect(screen.getByLabelText(/Ad A/)).toBeChecked();
  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(screen.queryByText(mockMessages['meta.offline'])).toBeNull());
});
test('disconnected, successful empty, partial and no-results are distinct', async () => {
  const { client } = setup();
  await screen.findByLabelText(/Ad A/);
  fireEvent.change(screen.getByLabelText(mockMessages['meta.filter']), {
    target: { value: 'missing' },
  });
  expect(screen.getByText(mockMessages['meta.noResults'])).toBeVisible();
  metaAdsAPI.ads.mockResolvedValue(
    wire('ads', [], { ad_account_id: 'act_10', campaign_id: '11', partial: true }),
  );
  await act(async () =>
    client.invalidateQueries({ predicate: (query) => query.queryKey[3] === 'ads' }),
  );
  await screen.findByText(mockMessages['meta.partial']);
  expect(screen.queryByText(mockMessages['meta.empty'])).toBeNull();
  metaAdsAPI.accounts.mockResolvedValue({ data: { connected: false, workspace_id: 7 } });
  await act(async () =>
    client.invalidateQueries({ predicate: (query) => query.queryKey[3] === 'accounts' }),
  );
  await screen.findByText(mockMessages['meta.disconnected']);
});
test('wire validator rejects scope and unauthorized items', () => {
  expect(() =>
    parseMetaRead(
      wire('ads', [ad], { ad_account_id: 'act_20', campaign_id: '11' }).data,
      'ads',
      7,
      'act_10',
      '11',
    ),
  ).toThrow();
  expect(() =>
    parseMetaRead(
      wire('ads', [{ ...ad, campaign_id: '22' }], { ad_account_id: 'act_10', campaign_id: '11' })
        .data,
      'ads',
      7,
      'act_10',
      '11',
    ),
  ).toThrow();
});
test.each(['accounts', 'campaigns', 'ads'])(
  '%s slow request stays loading until verified response',
  async (kind) => {
    let resolve;
    const response =
      kind === 'accounts'
        ? wire(kind, accounts)
        : kind === 'campaigns'
          ? wire(kind, [campaign], { ad_account_id: 'act_10' })
          : wire(kind, [ad], { ad_account_id: 'act_10', campaign_id: '11' });
    metaAdsAPI[kind].mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    setup();
    await screen.findByText(mockMessages['meta.loading']);
    await waitFor(() => expect(metaAdsAPI[kind]).toHaveBeenCalled());
    expect(screen.queryByText(mockMessages['meta.empty'])).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await act(async () => resolve(response));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  },
);
test('one failed campaign read shows successful ads without claiming all campaigns are empty', async () => {
  metaAdsAPI.campaigns.mockResolvedValue(
    wire('campaigns', [campaign, { id: '12', name: 'Campaign Two', account_id: '10' }], {
      ad_account_id: 'act_10',
    }),
  );
  metaAdsAPI.ads.mockImplementation((w, a, c) =>
    c === '12'
      ? Promise.reject(unavailable)
      : Promise.resolve(wire('ads', [ad], { ad_account_id: a, campaign_id: c })),
  );
  setup({ ...selection, campaign_ids: ['11', '12'] });
  await screen.findByLabelText(/Ad A/);
  await screen.findByText(mockMessages['meta.unavailable']);
  expect(screen.getByLabelText(/Ad A/)).toBeChecked();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(screen.queryByText(mockMessages['meta.empty'])).toBeNull();
});

test('unverified saved ads survive editing another campaign until its read recovers', async () => {
  metaAdsAPI.campaigns.mockResolvedValue(wire('campaigns', [campaign, { id: '12', name: 'Campaign Two', account_id: '10' }], { ad_account_id: 'act_10' }));
  const second = { id: '121', name: 'Ad Two', campaign_id: '12', is_ctwa: true };
  metaAdsAPI.ads.mockImplementation((w, a, c) => c === '12' ? Promise.reject(unavailable) : Promise.resolve(wire('ads', [ad], { ad_account_id: a, campaign_id: c })));
  setup({ ...selection, campaign_ids: ['11', '12'], ad_ids: ['111', '121'] });
  await screen.findByLabelText(/Ad A/);
  await screen.findByText(mockMessages['meta.unavailable']);
  expect(screen.getByLabelText('Campaign A')).toBeDisabled();
  expect(screen.getByLabelText(/Ad A/)).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Ad A/));
  expect(screen.getByTestId('selection')).toHaveTextContent('121');
  metaAdsAPI.ads.mockImplementation((w, a, c) => Promise.resolve(wire('ads', c === '12' ? [second] : [ad], { ad_account_id: a, campaign_id: c })));
  expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByLabelText(/Ad Two/);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  expect(screen.getByLabelText(/Ad Two/)).toBeChecked();
});


test.each(['campaigns', 'ads'])('partial %s cannot silently discard an unverified saved selection', async kind => {
  const secondCampaign = { id: '12', name: 'Campaign Two', account_id: '10' };
  const secondAd = { id: '121', name: 'Ad Two', campaign_id: '12', is_ctwa: true };
  metaAdsAPI.campaigns.mockResolvedValue(wire('campaigns', kind === 'campaigns' ? [campaign] : [campaign, secondCampaign], { ad_account_id: 'act_10', partial: kind === 'campaigns' }));
  metaAdsAPI.ads.mockImplementation((w, a, c) => Promise.resolve(wire('ads', c === '11' ? [ad] : [], { ad_account_id: a, campaign_id: c, partial: kind === 'ads' && c === '12' })));
  setup({ ...selection, campaign_ids: ['11', '12'], ad_ids: kind === 'campaigns' ? [] : ['111', '121'] });
  await screen.findByLabelText(/Ad A/);
  await screen.findByText(mockMessages['meta.partial']);
  expect(screen.getByLabelText('Campaign A')).toBeDisabled();
  expect(screen.getByLabelText(/Ad A/)).toBeDisabled();
  const before = screen.getByTestId('selection').textContent;
  fireEvent.click(screen.getByLabelText(/Ad A/));
  expect(screen.getByTestId('selection').textContent).toBe(before);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  const refresh = screen.getAllByRole('button', { name: 'Refresh' })[kind === 'campaigns' ? 1 : 3];
  expect(refresh).toBeEnabled();
  metaAdsAPI.campaigns.mockResolvedValue(wire('campaigns', [campaign, secondCampaign], { ad_account_id: 'act_10' }));
  metaAdsAPI.ads.mockImplementation((w, a, c) => Promise.resolve(wire('ads', c === '12' ? [secondAd] : [ad], { ad_account_id: a, campaign_id: c })));
  fireEvent.click(refresh);
  await screen.findByLabelText(/Ad Two/);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  expect(screen.getByLabelText('Campaign Two')).toBeChecked();
  if (kind === 'ads') expect(screen.getByLabelText(/Ad Two/)).toBeChecked();
  expect(screen.getByTestId('selection').textContent).toBe(before);
});
