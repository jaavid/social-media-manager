import { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Route, Server, XCircle } from 'lucide-react';
import { useSession as useAuth } from '../core/session';
import { egressAPI } from '../services/egress';

function Reachability({ value }) {
  if (!value) return <span style={styles.muted}>Not tested</span>;
  if (value.reachable) {
    return (
      <span style={styles.ok}>
        <CheckCircle2 size={14} /> Reachable
        {Number.isFinite(value.latency_ms) ? ` · ${value.latency_ms} ms` : ''}
        {value.upstream_status != null ? ` · HTTP ${value.upstream_status}` : value.status != null ? ` · HTTP ${value.status}` : ''}
      </span>
    );
  }
  return (
    <span style={styles.bad}>
      <XCircle size={14} /> {value.error || 'Unreachable'}
      {Number.isFinite(value.latency_ms) ? ` · ${value.latency_ms} ms` : ''}
    </span>
  );
}

function RouteBadge({ route }) {
  const usable = route && route !== 'unavailable';
  return (
    <span style={{ ...styles.routeBadge, ...(usable ? styles.routeBadgeOk : styles.routeBadgeBad) }}>
      {route || 'unknown'}
    </span>
  );
}

export default function ApiConnectivityPanel() {
  const { user } = useAuth();
  const operator = user?.role === 'superadmin' || user?.role === 'staff';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testingService, setTestingService] = useState('');
  const [error, setError] = useState('');

  if (!operator) return null;

  const runAll = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await egressAPI.connectivity();
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Connectivity test failed.');
    } finally {
      setLoading(false);
    }
  };

  const retest = async (service) => {
    setTestingService(service);
    setError('');
    try {
      const response = await egressAPI.connectivity(service);
      const tested = response.data?.services?.[0];
      if (!tested) return;
      setData((current) => {
        const existing = current?.services || [];
        const next = existing.some((item) => item.id === service)
          ? existing.map((item) => item.id === service ? tested : item)
          : [...existing, tested];
        return {
          ...(current || response.data),
          checked_at: response.data.checked_at,
          gateway: response.data.gateway,
          services: next,
        };
      });
    } catch (err) {
      setError(err.response?.data?.detail || `Could not test ${service}.`);
    } finally {
      setTestingService('');
    }
  };

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}><Route size={14} /> Infrastructure</div>
          <h2 style={styles.heading}>API Connectivity</h2>
          <p style={styles.copy}>
            Test direct internet access and the configured API Access Gateway from this server.
            HTTP 4xx responses still count as reachable because this test checks network connectivity, not credentials.
          </p>
        </div>
        <button type="button" onClick={runAll} disabled={loading} style={styles.button}>
          <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          {loading ? 'Testing…' : data ? 'Test all again' : 'Run connectivity test'}
        </button>
      </div>

      {error && <div style={styles.error}><AlertCircle size={15} /> {error}</div>}

      {!data && !loading && (
        <div style={styles.empty}>
          No probes have run yet. Tests use short unauthenticated reachability requests and never expose platform tokens.
        </div>
      )}

      {data && (
        <>
          <div style={styles.gatewayCard}>
            <div style={styles.gatewayTitle}><Server size={16} /> API Access Gateway</div>
            <Reachability value={data.gateway} />
            {data.gateway?.version && <span style={styles.muted}>v{data.gateway.version}</span>}
            {data.gateway?.configured === false && <span style={styles.muted}>API_GATEWAY_URL is not configured.</span>}
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Service</th>
                  <th style={styles.th}>Mode</th>
                  <th style={styles.th}>Direct</th>
                  <th style={styles.th}>Gateway</th>
                  <th style={styles.th}>Runtime</th>
                  <th style={styles.th}>Recommended</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {(data.services || []).map((service) => (
                  <tr key={service.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.serviceName}>{service.name}</div>
                      <code style={styles.code}>{service.id}</code>
                    </td>
                    <td style={styles.td}><RouteBadge route={service.mode} /></td>
                    <td style={styles.td}><Reachability value={service.direct} /></td>
                    <td style={styles.td}><Reachability value={service.gateway} /></td>
                    <td style={styles.td}>
                      <RouteBadge route={service.active_route} />
                      {service.circuit_open && <div style={styles.circuit}>direct circuit temporarily open</div>}
                    </td>
                    <td style={styles.td}><RouteBadge route={service.recommended_route} /></td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        onClick={() => retest(service.id)}
                        disabled={Boolean(testingService)}
                        style={styles.smallButton}
                      >
                        {testingService === service.id ? 'Testing…' : 'Retest'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.checked_at && (
            <div style={styles.checked}>Last checked: {new Date(data.checked_at).toLocaleString()}</div>
          )}
        </>
      )}
    </section>
  );
}

const styles = {
  section: { marginTop: 28, borderTop: '1px solid var(--border-subtle)', paddingTop: 24 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' },
  eyebrow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' },
  heading: { margin: '6px 0', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' },
  copy: { margin: 0, maxWidth: 760, color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.6 },
  button: { display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--surface-card)', color: 'var(--text-primary)', padding: '9px 12px', cursor: 'pointer', fontWeight: 700 },
  smallButton: { border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--surface-card)', color: 'var(--text-primary)', padding: '6px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  gatewayCard: { marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 14, borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' },
  gatewayTitle: { display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 13, marginRight: 8 },
  tableWrap: { overflowX: 'auto', marginTop: 14, border: '1px solid var(--border-subtle)', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 1000, background: 'var(--surface-card)' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary)', background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border-subtle)' },
  tr: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '12px', verticalAlign: 'middle', fontSize: 12, color: 'var(--text-secondary)' },
  serviceName: { fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 },
  code: { fontSize: 11, color: 'var(--text-tertiary)' },
  ok: { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap' },
  bad: { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#b91c1c', fontWeight: 700, whiteSpace: 'nowrap' },
  muted: { color: 'var(--text-tertiary)', fontSize: 12 },
  routeBadge: { display: 'inline-flex', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
  routeBadgeOk: { background: 'var(--surface-sunken)', color: 'var(--text-secondary)' },
  routeBadgeBad: { background: '#fef2f2', color: '#b91c1c' },
  circuit: { marginTop: 4, fontSize: 10, color: '#b45309' },
  empty: { marginTop: 16, padding: 16, border: '1px dashed var(--border-default)', borderRadius: 12, color: 'var(--text-tertiary)', fontSize: 13 },
  error: { marginTop: 14, display: 'flex', alignItems: 'center', gap: 7, padding: 10, borderRadius: 9, background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 700 },
  checked: { marginTop: 8, textAlign: 'right', color: 'var(--text-tertiary)', fontSize: 11 },
};
