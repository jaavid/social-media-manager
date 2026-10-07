/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Input from '../../../components/ui/Input';
import { cn } from '../../../lib/utils';
/**
 *
 *   <MFAManager />        — TOTP enrol / disable / regenerate codes
 *   <ActiveSessionsList /> — list + revoke + sign-out-everywhere
 *
 * Both components are self-contained — drop into any page that needs them.
 */

import { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  RefreshCw,
  AlertTriangle,
  X,
  Copy,
  Wand2,
} from 'lucide-react';
import { mfaAPI } from '../../../services/api';
import toast from '../../../components/ui/toast';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

// ─────────────────────────────────────────────────────────────────────────
// MFA Manager
// ─────────────────────────────────────────────────────────────────────────
export function MFAManager() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enrolment wizard state
  const [setupData, setSetupData] = useState(null); // {secret, qr_data_uri, otpauth_url}
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);

  // Just-issued backup codes (shown once)
  const [backupCodes, setBackupCodes] = useState(null);

  // Disable wizard state
  const [disableOpen, setDisableOpen] = useState(false);
  function load() {
    setLoading(true);
    mfaAPI
      .status()
      .then((r) => setStatus(r.data))
      .catch(() => toast.error('Could not load MFA status'))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);
  async function startSetup() {
    setBusy(true);
    try {
      const r = await mfaAPI.setup();
      setSetupData(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not start MFA setup');
    } finally {
      setBusy(false);
    }
  }
  async function confirmSetup() {
    if (!verifyCode.trim()) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const r = await mfaAPI.verifySetup(verifyCode.trim());
      setBackupCodes(r.data.backup_codes || []);
      setSetupData(null);
      setVerifyCode('');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Verification failed');
    } finally {
      setBusy(false);
    }
  }
  async function regenerateBackupCodes() {
    const code = window.prompt(
      'Enter your current 6-digit code to regenerate backup codes:',
    );
    if (!code) return;
    try {
      const r = await mfaAPI.regenerateBackupCodes(code.trim());
      setBackupCodes(r.data.backup_codes || []);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not regenerate codes');
    }
  }
  async function disableMfa(password, code) {
    setBusy(true);
    try {
      await mfaAPI.disable({
        password,
        code,
      });
      toast.success('MFA disabled');
      setDisableOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not disable MFA');
    } finally {
      setBusy(false);
    }
  }
  function copyAll(codes) {
    try {
      navigator.clipboard.writeText(codes.join('\n'));
      toast.success('Backup codes copied');
    } catch {
      toast.error('Could not copy');
    }
  }
  if (loading)
    return (
      <Card padding="md">
        <div className={cn('[color:var(--text-tertiary)]')}>Loading…</div>
      </Card>
    );

  // — Enrolment wizard step 1 (QR shown) —
  if (setupData) {
    return (
      <Card padding="md">
        <div
          className={cn(
            '[font-size:15px]',
            '[font-weight:700]',
            '[margin-bottom:6px]',
          )}
        >
          <Shield
            size={16}
            className={cn('[vertical-align:-3px]', '[margin-inline-end:6px]')}
          />
          Enrol MFA — step 1 of 2
        </div>
        <p
          className={cn(
            '[margin:0_0_12px]',
            '[font-size:13px]',
            '[color:var(--text-secondary)]',
          )}
        >
          Scan the QR code with Google Authenticator, 1Password, or any TOTP
          app.
        </p>
        <div
          className={cn(
            '[display:inline-block]',
            '[padding:12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-sm)]',
            '[margin-bottom:10px]',
          )}
        >
          <img
            src={setupData.qr_data_uri}
            alt="MFA QR"
            className={cn('[width:180px]', '[height:180px]', '[display:block]')}
          />
        </div>
        <div
          className={cn(
            '[font-size:12px]',
            '[color:var(--text-tertiary)]',
            '[margin-bottom:10px]',
          )}
        >
          Or enter manually:{' '}
          <code className={cn('[user-select:all]')}>{setupData.secret}</code>
        </div>
        <div
          className={cn(
            '[display:flex]',
            '[gap:8px]',
            '[align-items:center]',
            '[max-width:360px]',
          )}
        >
          <Input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
          />

          <Button
            onClick={confirmSetup}
            disabled={busy}
            icon={ShieldCheck}
            size="sm"
          >
            {busy ? 'Verifying…' : 'Verify'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={X}
            aria-label="Cancel"
            onClick={() => {
              setSetupData(null);
              setVerifyCode('');
            }}
          />
        </div>
      </Card>
    );
  }

  // — Just-issued backup codes —
  if (backupCodes) {
    return (
      <Card
        padding="md"
        className={cn(
          '[border-color:var(--warning)]',
          '[background:var(--warning-bg)]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[gap:6px]',
            '[font-weight:700]',
            '[color:var(--warning)]',
            '[margin-bottom:6px]',
          )}
        >
          <AlertTriangle size={14} /> Save these backup codes — shown once
        </div>
        <p
          className={cn(
            '[margin:0_0_12px]',
            '[font-size:13px]',
            '[color:var(--text-secondary)]',
          )}
        >
          Each code can be used ONCE if you lose your authenticator. Store them
          in a password manager.
        </p>
        <div
          className={cn(
            '[display:grid]',
            '[grid-template-columns:repeat(2,_1fr)]',
            '[gap:6px]',
            '[padding:10px]',
            '[background:var(--surface-sunken)]',
            '[border-radius:var(--radius-sm)]',
            '[font-family:var(--font-mono)]',
            '[font-size:13px]',
            '[user-select:all]',
          )}
        >
          {backupCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className={cn('[margin-top:10px]', '[display:flex]', '[gap:8px]')}>
          <Button size="sm" icon={Copy} onClick={() => copyAll(backupCodes)}>
            Copy all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBackupCodes(null)}
          >
            I've saved them
          </Button>
        </div>
      </Card>
    );
  }

  // — Disabled MFA panel —
  if (!status?.enabled) {
    return (
      <Card padding="md">
        <div
          className={cn(
            '[display:flex]',
            '[gap:14px]',
            '[align-items:flex-start]',
          )}
        >
          <span
            className={cn(
              '[width:40px]',
              '[height:40px]',
              '[flex-shrink:0]',
              '[background:var(--surface-sunken)]',
              '[color:var(--text-tertiary)]',
              '[border-radius:var(--radius-md)]',
              '[display:inline-flex]',
              '[align-items:center]',
              '[justify-content:center]',
            )}
          >
            <ShieldOff size={18} />
          </span>
          <div className={cn('[flex:1]')}>
            <div className={cn('[font-size:15px]', '[font-weight:600]')}>
              Two-factor auth (TOTP)
            </div>
            <p
              className={cn(
                '[margin:4px_0_12px]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
              )}
            >
              Add a second factor — a 6-digit code from your authenticator app —
              on top of your password. Strongly recommended for admin accounts.
            </p>
            <Button size="sm" icon={Wand2} disabled={busy} onClick={startSetup}>
              {busy ? 'Starting…' : 'Set up MFA'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // — Enabled MFA panel —
  return (
    <Card padding="md">
      <div
        className={cn(
          '[display:flex]',
          '[gap:14px]',
          '[align-items:flex-start]',
        )}
      >
        <span
          className={cn(
            '[width:40px]',
            '[height:40px]',
            '[flex-shrink:0]',
            '[background:var(--success-bg)]',
            '[color:var(--success)]',
            '[border-radius:var(--radius-md)]',
            '[display:inline-flex]',
            '[align-items:center]',
            '[justify-content:center]',
          )}
        >
          <ShieldCheck size={18} />
        </span>
        <div className={cn('[flex:1]')}>
          <div
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[gap:6px]',
            )}
          >
            <div className={cn('[font-size:15px]', '[font-weight:600]')}>
              Two-factor auth is on
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <p
            className={cn(
              '[margin:4px_0_12px]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
            )}
          >
            {status.backup_codes_remaining} backup code
            {status.backup_codes_remaining === 1 ? '' : 's'} remaining ·{' '}
            {status.last_used_at
              ? `last used ${new Date(status.last_used_at).toLocaleDateString()}`
              : 'never used yet'}
          </p>
          <div
            className={cn('[display:flex]', '[gap:8px]', '[flex-wrap:wrap]')}
          >
            <Button
              size="sm"
              icon={Key}
              variant="secondary"
              onClick={regenerateBackupCodes}
            >
              Regenerate backup codes
            </Button>
            <Button
              size="sm"
              icon={ShieldOff}
              variant="danger"
              onClick={() => setDisableOpen(true)}
            >
              Disable MFA
            </Button>
          </div>
        </div>
      </div>

      {disableOpen && (
        <DisableMfaModal
          busy={busy}
          onClose={() => setDisableOpen(false)}
          onConfirm={disableMfa}
        />
      )}
    </Card>
  );
}
function DisableMfaModal({ busy, onClose, onConfirm }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        '[position:fixed]',
        '[inset:0]',
        '[z-index:1300]',
        '[background:rgba(10,14,20,0.55)]',
        '[display:flex]',
        '[align-items:center]',
        '[justify-content:center]',
        '[padding:20px]',
      )}
    >
      <div
        className={cn(
          '[width:100%]',
          '[max-width:420px]',
          '[background:var(--surface-elevated)]',
          '[border:1px_solid_var(--border-default)]',
          '[border-radius:var(--radius-lg)]',
          '[padding:18px]',
        )}
      >
        <h2
          className={cn(
            '[margin:0_0_6px]',
            '[font-size:16px]',
            '[font-weight:700]',
            '[color:var(--danger)]',
          )}
        >
          Disable MFA
        </h2>
        <p
          className={cn(
            '[margin:0_0_12px]',
            '[font-size:12px]',
            '[color:var(--text-secondary)]',
          )}
        >
          We require your password AND a current 6-digit code so a hijacker
          can't disable MFA from a stolen session.
        </p>
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          showPasswordToggle={false}
        />
        <Input
          label="Authentication code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          inputMode="numeric"
          maxLength={6}
        />

        <div
          className={cn(
            '[display:flex]',
            '[justify-content:flex-end]',
            '[gap:8px]',
            '[margin-top:14px]',
          )}
        >
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => onConfirm(password, code.trim())}
          >
            {busy ? 'Disabling…' : 'Disable MFA'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { default as ActiveSessionsList } from './ActiveSessionsList';
