/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { metaAdsAPI } from '@/services/domains/accounts';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import DataState from '@/components/ui/DataState';

/** Meta-owned extension. The parent may save only a verified current scope. */
export default function MetaAdsPicker({
  value,
  onChange,
  workspaceId,
  onValidityChange,
  disabled,
}) {
  const { user } = useSession();
  const scope = Number(workspaceId || user?.workspace_id || user?.client_id) || null;
  const identity = [user?.id, user?.role, user?.account_type];
  const owner = JSON.stringify([...identity, scope]);
  const previousOwner = useRef(owner);
  const [selectionOwner, setSelectionOwner] = useState(owner);
  useEffect(() => {
    if (previousOwner.current !== owner) {
      previousOwner.current = owner;
      onChange({ ad_account_id: '', campaign_ids: [], ad_ids: [] });
    }
  }, [owner, onChange]);
  return (
    <ScopedPicker
      key={JSON.stringify([...identity, scope])}
      identity={identity}
      workspace={scope}
      value={selectionOwner === owner ? value : undefined}
      onChange={(next) => {
        setSelectionOwner(owner);
        onChange(next);
      }}
      onValidityChange={onValidityChange}
      disabled={disabled}
    />
  );
}

export function parseMetaRead(data, collection, workspace, account, campaign) {
  if (
    !data ||
    typeof data !== 'object' ||
    data.workspace_id !== workspace ||
    typeof data.connected !== 'boolean'
  )
    throw new Error('Invalid Meta scope');
  if (!data.connected) return { disconnected: true, rows: [], partial: false };
  if (
    (account && data.ad_account_id !== account) ||
    (campaign && data.campaign_id !== campaign) ||
    typeof data.partial !== 'boolean' ||
    !Array.isArray(data[collection])
  )
    throw new Error('Invalid Meta collection');
  const rows = data[collection];
  if (
    rows.some(
      (row) =>
        !row ||
        typeof row.id !== 'string' ||
        !row.id ||
        typeof row.name !== 'string' ||
        (collection === 'accounts' && !/^act_[0-9]+$/.test(row.id)) ||
        (collection !== 'accounts' && !/^[0-9]+$/.test(row.id)) ||
        (collection === 'campaigns' && String(row.account_id) !== account.slice(4)) ||
        (collection === 'ads' &&
          (row.campaign_id !== campaign || typeof row.is_ctwa !== 'boolean')),
    ) ||
    new Set(rows.map((row) => row.id)).size !== rows.length
  )
    throw new Error('Invalid Meta items');
  return { disconnected: false, rows, partial: data.partial };
}

// Denials hide private cached rows; recoverable same-key failure preserves them.
function visible(query) {
  const error = apiError(query.error);
  return [401, 403, 404].includes(error.status) ? undefined : query.data;
}
function ScopedPicker({ identity, workspace, value, onChange, onValidityChange, disabled }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const account = value?.ad_account_id || '';
  const selectedCampaigns = Array.isArray(value?.campaign_ids) ? value.campaign_ids : [];
  const selectedAds = Array.isArray(value?.ad_ids) ? value.ad_ids : [];
  const accounts = useQuery({
    queryKey: QK.metaAds(identity, workspace, 'accounts'),
    enabled: !!workspace,
    queryFn: async ({ signal }) =>
      parseMetaRead((await metaAdsAPI.accounts(workspace, signal)).data, 'accounts', workspace),
  });
  const accountData = visible(accounts);
  const accountValid = !!accountData?.rows.some((row) => row.id === account);
  const campaigns = useQuery({
    queryKey: QK.metaAds(identity, workspace, 'campaigns', account),
    enabled: accountValid,
    queryFn: async ({ signal }) =>
      parseMetaRead(
        (await metaAdsAPI.campaigns(workspace, account, signal)).data,
        'campaigns',
        workspace,
        account,
      ),
  });
  const campaignData = accountValid ? visible(campaigns) : undefined;
  const verifiedCampaigns = selectedCampaigns.filter((id) =>
    campaignData?.rows.some((row) => row.id === id),
  );
  const ads = useQueries({
    queries: verifiedCampaigns.map((campaign) => ({
      queryKey: QK.metaAds(identity, workspace, 'ads', account, campaign),
      queryFn: async ({ signal }) =>
        parseMetaRead(
          (await metaAdsAPI.ads(workspace, account, campaign, signal)).data,
          'ads',
          workspace,
          account,
          campaign,
        ),
    })),
  });
  const adRows = ads.flatMap((query) => visible(query)?.rows || []);
  const valid =
    accountValid &&
    !accountData?.disconnected &&
    !campaignData?.disconnected &&
    selectedCampaigns.length > 0 &&
    verifiedCampaigns.length === selectedCampaigns.length &&
    ads.every((query) => visible(query) && !visible(query).disconnected) &&
    selectedAds.every((id) => adRows.some((row) => row.id === id));
  useEffect(() => {
    onValidityChange?.(valid);
    return () => onValidityChange?.(false);
  }, [valid, onValidityChange]);

  // Saved choices outside a failed/partial read cannot be silently discarded by another edit.
  const selectionPending = verifiedCampaigns.length !== selectedCampaigns.length ||
    (selectedAds.length > 0 && (ads.some(query => !visible(query)) ||
      selectedAds.some(id => !adRows.some(row => row.id === id))));
  function emit(nextCampaigns, nextAds) {
    if (!accountValid || selectionPending || disabled) return;
    onChange({
      ...value,
      ad_account_id: account,
      campaign_ids: nextCampaigns.filter((id) => campaignData?.rows.some((row) => row.id === id)),
      ad_ids: nextAds.filter((id) =>
        adRows.some((row) => row.id === id && nextCampaigns.includes(row.campaign_id)),
      ),
    });
  }
  const filtered = adRows.filter((row) =>
    `${row.name} ${row.id}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div className="min-w-0 space-y-4">
      {!workspace && <DataState compact state="forbidden" title={t('meta.scopeRequired')} />}
      {!!workspace && <ReadState query={accounts} title={t('meta.accounts')} />}
      {accountData && !accountData.disconnected && (
        <NativeSelect
          label={t('meta.accounts')}
          value={accountValid ? account : ''}
          disabled={disabled}
          onChange={(event) => {
            setSearch('');
            onChange({ ...value, ad_account_id: event.target.value, campaign_ids: [], ad_ids: [] });
          }}
        >
          <option value="">{t('meta.pickAccount')}</option>
          {accountData.rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {accountValid && (
        <fieldset className="min-w-0 space-y-2" disabled={disabled}>
          <legend className="ds-field-label">{t('meta.campaigns')}</legend>
          <ReadState query={campaigns} title={t('meta.campaigns')} />
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {campaignData?.rows.map((row) => (
              <Checkbox
                disabled={selectionPending}
                className="flex w-full rounded border border-border p-2"
                key={row.id}
                label={row.name}
                checked={verifiedCampaigns.includes(row.id)}
                onChange={() => {
                  const next = verifiedCampaigns.includes(row.id)
                    ? verifiedCampaigns.filter((id) => id !== row.id)
                    : [...verifiedCampaigns, row.id];
                  emit(next, selectedAds);
                }}
              />
            ))}
          </div>
        </fieldset>
      )}
      {verifiedCampaigns.length > 0 && (
        <fieldset className="min-w-0 space-y-2" disabled={disabled}>
          <legend className="ds-field-label">{t('meta.ads')}</legend>
          {ads.map((query, i) => (
            <ReadState
              key={verifiedCampaigns[i]}
              query={query}
              title={campaignData.rows.find((row) => row.id === verifiedCampaigns[i])?.name}
            />
          ))}
          <Input
            type="search"
            label={t('meta.filter')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {filtered.length === 0 && adRows.length > 0 && (
            <DataState compact state="no-results" title={t('meta.noResults')} />
          )}
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {filtered.map((row) => (
              <Checkbox
                disabled={selectionPending}
                className="flex w-full rounded border border-border p-2"
                key={row.id}
                label={
                  <span className="break-words">
                    {row.name} {row.is_ctwa && <bdi>CTWA</bdi>}
                  </span>
                }
                checked={selectedAds.includes(row.id)}
                onChange={() =>
                  emit(
                    verifiedCampaigns,
                    selectedAds.includes(row.id)
                      ? selectedAds.filter((id) => id !== row.id)
                      : [...selectedAds, row.id],
                  )
                }
              />
            ))}
          </div>
        </fieldset>
      )}
      {!valid && account && <DataState compact state="unavailable" title={t('meta.unverified')} />}
    </div>
  );
}
function ReadState({ query, title }) {
  const { t } = useLanguage();
  const data = visible(query),
    error = apiError(query.error);
  const state = query.isPaused
    ? 'offline'
    : query.error
      ? error.status === 403
        ? 'forbidden'
        : error.status === 404
          ? 'not-found'
          : data
            ? 'stale'
            : error.kind === 'unavailable'
              ? 'unavailable'
              : 'error'
      : query.isFetching
        ? data
          ? 'refreshing'
          : 'loading'
        : data?.disconnected
          ? 'unavailable'
          : data?.partial
            ? 'partial'
            : data?.rows.length === 0
              ? 'empty'
              : null;
  return (
    <div className="space-y-2">
      {state && (
        <DataState
          compact
          state={state}
          title={t(data?.disconnected ? 'meta.disconnected' : `meta.${state}`)}
          description={title}
          referenceId={error.referenceId}
        />
      )}
      <Button
        size="sm"
        disabled={query.isFetching || query.isPaused}
        onClick={() => void query.refetch()}
      >
        {t(query.error ? 'meta.retry' : 'meta.refresh')}
      </Button>
    </div>
  );
}
