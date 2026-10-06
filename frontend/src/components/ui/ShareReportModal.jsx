/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { connectionsAPI } from '@/services/domains/connections';
import { sharedReportsAPI } from '@/services/domains/reporting';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import Modal from './Modal';
import Input from './Input';
import NativeSelect from './NativeSelect';
import Button from './Button';
import DataState from './DataState';
import Checkbox from './Checkbox';

export default function ShareReportModal(props) {
  const { user } = useSession();
  return <ReportLinkForm key={`${user?.id}:${props.clientId}`} {...props} />;
}
function ReportLinkForm({ clientId, onClose, socialAccountIds = [], dateRange }) {
  const { t, language } = useLanguage();
  const { user } = useSession();
  const today = new Date().toISOString().slice(0, 10);
  const [since, setSince] = useState(dateRange?.since || today.slice(0, 8) + '01');
  const [until, setUntil] = useState(dateRange?.until || today);
  const [selected, setSelected] = useState(socialAccountIds.map(String));
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('7');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const current = useRef(true);
  const errorRef = useRef(null);
  useEffect(() => {
    current.current = true;
    return () => {
      current.current = false;
    };
  }, []);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const metadata = useQuery({
    queryKey: [...QK.connections(Number(clientId)), user?.id],
    queryFn: ({ signal }) => connectionsAPI.get(Number(clientId), signal),
    retry: false,
  });
  const accounts = (metadata.data?.providers || []).flatMap((provider) =>
    provider.accounts
      .filter(
        (account) =>
          account.permissions.view_analytics === true &&
          account.permissions.generate_reports === true &&
          ['supported', 'beta'].includes(provider.capabilities.analytics) &&
          provider.contract.analytics?.metrics.length,
      )
      .map((account) => ({ account, provider })),
  );
  const ids = selected.map(Number).filter((id) => accounts.some((item) => item.account.id === id));
  async function create(event) {
    event.preventDefault();
    if (busy.current || metadata.error || !ids.length || since > until) return;
    busy.current = true;
    setPending(true);
    setError(null);
    const expires = new Date();
    expires.setDate(expires.getDate() + Number(expiry));
    try {
      const response = await sharedReportsAPI.create({
        client: Number(clientId),
        date_from: since,
        date_until: until,
        social_account_ids: ids,
        platforms: [
          ...new Set(
            accounts
              .filter((item) => ids.includes(item.account.id))
              .map((item) => item.provider.key),
          ),
        ],
        password,
        expires_at: expiry ? expires.toISOString() : null,
      });
      if (
        response.status !== 201 ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(response.data?.token)
      )
        throw new Error('Invalid shared report');
      if (current.current)
        setLink(new URL(`/report/${response.data.token}`, window.location.origin).href);
    } catch (failure) {
      if (current.current) setError(failure);
    } finally {
      busy.current = false;
      if (current.current) setPending(false);
    }
  }
  return (
    <Modal
      open
      title={t('reports.create')}
      description={t('reports.shareWarning')}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      {metadata.isPending && <DataState state="loading" title={t('engagement.loading')} />}
      {metadata.error && (
        <DataState
          state="error"
          title={t('analytics.report.error')}
          action={<Button onClick={() => metadata.refetch()}>{t('analytics.report.retry')}</Button>}
        />
      )}
      {metadata.data && !metadata.error && !accounts.length && (
        <DataState state="unavailable" title={t('analytics.report.unavailable')} />
      )}
      {metadata.data && !metadata.error && !!accounts.length && !link && (
        <form onSubmit={create} className="space-y-4">
          <Input
            type="date"
            required
            label={t('analytics.report.since')}
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
          <Input
            type="date"
            required
            label={t('analytics.report.until')}
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
          <fieldset>
            <legend>{t('analytics.report.account')}</legend>
            {accounts.map(({ account, provider }) => (
              <Checkbox
                key={account.id}
                label={`${provider.titles[language]} · ${account.name} · ${account.destination.id}`}
                checked={selected.includes(String(account.id))}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked
                      ? [...prev, String(account.id)]
                      : prev.filter((id) => id !== String(account.id)),
                  )
                }
              />
            ))}
          </fieldset>
          <Input
            type="password"
            autoComplete="new-password"
            label={t('reports.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <NativeSelect
            label={t('reports.expiry')}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="1">{t('reports.oneDay')}</option>
            <option value="7">{t('reports.week')}</option>
            <option value="30">{t('reports.month')}</option>
          </NativeSelect>
          <Button type="submit" disabled={pending || !ids.length || since > until}>
            {t('reports.create')}
          </Button>
        </form>
      )}
      {error && (
        <DataState
          focusRef={errorRef}
          state="error"
          compact
          title={t('reports.shareFailed')}
          referenceId={apiError(error).referenceId}
        />
      )}
      {link && (
        <div className="space-y-3">
          <QRCodeSVG value={link} size={144} title={t('reports.link')} />
          <Input readOnly label={t('reports.link')} value={link} />
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch (failure) {
                setError(failure);
              }
            }}
          >
            {t('reports.copy')}
          </Button>
          {copied && <p role="status">{t('reports.copied')}</p>}
        </div>
      )}
    </Modal>
  );
}
