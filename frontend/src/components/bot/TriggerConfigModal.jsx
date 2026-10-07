/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * TriggerConfigModal — opens when the user clicks Publish.
 *
 * Renders a trigger-type-specific config form (CTWA / keyword / first_message
 * / referral_link / button_reply / manual), saves the patched flow via
 * botAPI.patch, then calls botAPI.publish. The editor uses the returned
 * is_active flag to flip its UI.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { X, Plus, ArrowRight } from 'lucide-react';

import Input from '@/components/ui/Input';
import { FIELD_MESSAGES } from './editorMessages';
import { useSession } from '@/core/session';
import NativeSelect from '@/components/ui/NativeSelect';
import Checkbox from '@/components/ui/Checkbox';
import { botAPI } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DataState from '../ui/DataState';
import { useLanguage } from '@/i18n';
import { apiError } from '@/services/http/errors';
import MetaAdsPicker from './MetaAdsPicker';

const TRIGGER_TYPES = ['ctwa_ad', 'keyword', 'first_message', 'referral_link', 'button_reply', 'manual'];

export default function TriggerConfigModal(props) {
  const { user } = useSession();
  return (
    <TriggerEditor
      key={`${user?.id}:${user?.role}:${user?.account_type}:${props.flow.workspace ?? props.flow.client}:${props.flow.id}`}
      {...props}
    />
  );
}
function TriggerEditor({ flow, onClose, onPublished }) {
  const { t } = useLanguage();
  const pending = useRef(false);
  const alive = useRef(true);
  const errorRef = useRef(null);
  const [failure, setFailure] = useState(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [approval, setApproval] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);
  const [triggerType, setTriggerType] = useState(flow.trigger_type || 'ctwa_ad');
  const [configs, setConfigs] = useState({
    [flow.trigger_type || 'ctwa_ad']: flow.trigger_config || {},
  });
  const config = configs[triggerType] || {};
  const setConfig = useCallback(
    (next) => setConfigs((previous) => ({ ...previous, [triggerType]: next })),
    [triggerType],
  );
  const [drafts, setDrafts] = useState({});
  const draft = drafts[triggerType] || '';
  const setDraft = (next) => setDrafts((previous) => ({ ...previous, [triggerType]: next }));
  const listKey = {
    keyword: 'keywords',
    referral_link: 'referral_codes',
    button_reply: 'button_payloads',
  }[triggerType];
  const triggerValid =
    !listKey ||
    (Array.isArray(config[listKey]) &&
      config[listKey].length > 0 &&
      config[listKey].every((item) => typeof item === 'string' && item.trim()));
  const [busy, setBusy] = useState(false);
  const [metaValid, setMetaValid] = useState(false);
  const [validation, setValidation] = useState(null);

  async function go() {
    if (
      pending.current ||
      ambiguous ||
      approval ||
      (triggerType === 'ctwa_ad' && !metaValid) ||
      !triggerValid ||
      !!draft.trim()
    )
      return;
    pending.current = true;
    setBusy(true);
    setValidation(null);
    setFailure(null);
    let publishing = false;
    try {
      const saved = await botAPI.patch(flow.id, {
        trigger_type: triggerType,
        trigger_config: config,
      });
      if (saved.status === 202 && saved.data?.requires_approval === true) {
        if (alive.current) setApproval(true);
        return;
      }
      if (!saved.data || saved.data.id !== flow.id) throw new Error('Invalid trigger save');
      if (!alive.current) return;
      publishing = true;
      const r = await botAPI.publish(flow.id);
      if (r.status === 202 && r.data?.requires_approval === true) {
        if (alive.current) setApproval(true);
        return;
      }
      if (!r.data || r.data.id !== flow.id || r.data.is_active !== true)
        throw new Error('Invalid published flow');
      if (alive.current) onPublished?.(r.data);
    } catch (e) {
      if (!alive.current) return;
      const normalized = apiError(e);
      if (publishing && (!normalized.status || normalized.status >= 500)) setAmbiguous(true);
      if (
        normalized.status === 400 &&
        Array.isArray(e.response?.data?.issues) &&
        e.response.data.issues.every((issue) => typeof issue === 'string')
      )
        setValidation({ ok: false, issues: e.response.data.issues });
      setFailure(e);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={flow.name}
      description={t('editor.publishConfirm')}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            {t('reports.cancel')}
          </Button>
          <Button
            disabled={
              busy ||
              ambiguous ||
              approval ||
              (triggerType === 'ctwa_ad' && !metaValid) ||
              !triggerValid ||
              !!draft.trim()
            }
            onClick={go}
          >
            {t('editor.publishAction')} <ArrowRight size={13} />
          </Button>
        </>
      }
    >
      {approval && <DataState state="partial" compact title={t('editor.approvalQueued')} />}
      {failure && (
        <DataState
          focusRef={errorRef}
          state="error"
          compact
          title={t(ambiguous ? 'editor.publishUnknown' : 'editor.publishFailed')}
          referenceId={apiError(failure).referenceId}
        />
      )}
      <div style={{ padding: '0 20px 18px', flex: 1, overflowY: 'auto' }}>
        <NativeSelect
          label={t('bot.triggerType')}
          hint={t(`bot.trigger.${triggerType}.help`)}
          disabled={busy}
          value={triggerType}
          onChange={(event) => {
            setMetaValid(false);
            setTriggerType(event.target.value);
          }}
        >
          {TRIGGER_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`bot.trigger.${value}.label`)}
            </option>
          ))}
        </NativeSelect>
        <fieldset disabled={busy} className="mt-4 min-w-0 space-y-3">
          {/* Trigger-specific config */}
          {triggerType === 'ctwa_ad' && (
            <MetaAdsPicker
              value={config}
              onChange={setConfig}
              workspaceId={flow.workspace ?? flow.client}
              onValidityChange={setMetaValid}
              disabled={busy}
            />
          )}

          {triggerType === 'keyword' && (
            <KeywordConfig value={config} onChange={setConfig} draft={draft} setDraft={setDraft} />
          )}

          {triggerType === 'referral_link' && (
            <ReferralLinkConfig
              value={config}
              onChange={setConfig}
              draft={draft}
              setDraft={setDraft}
            />
          )}

          {triggerType === 'button_reply' && (
            <ButtonReplyConfig
              value={config}
              onChange={setConfig}
              draft={draft}
              setDraft={setDraft}
            />
          )}

          {(triggerType === 'first_message' || triggerType === 'manual') && (
            <Hint>{t('bot.noExtra')}</Hint>
          )}

          {!triggerValid && <DataState compact state="error" title={t('bot.triggerRequired')} />}
          {draft.trim() && <DataState compact state="partial" title={t('bot.addDraft')} />}
          {validation && !validation.ok && (
            <DataState compact state="error" title={t('bot.validationFailed')} />
          )}
        </fieldset>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// Per-trigger config widgets
// ─────────────────────────────────────────────────────────
function KeywordConfig({ value, onChange, draft, setDraft }) {
  const { t } = useLanguage();
  const keywords = Array.isArray(value?.keywords) ? value.keywords : [];

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange({ ...value, keywords: [...keywords, v], match_type: value?.match_type || 'contains' });
    setDraft('');
  }
  function remove(i) {
    onChange({ ...value, keywords: keywords.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <Field label="Keywords">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {keywords.map((k, i) => (
            <span key={i} style={kwChip}>
              {k}
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => remove(i)}
                aria-label={t('bot.removeValue', { value: k })}
              >
                <X size={10} />
              </Button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Input
            label={t('bot.keywordsDraft')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add();
                e.preventDefault();
              }
            }}
            placeholder="hi, hello, interested"
          />
          <Button variant="secondary" size="sm" type="button" onClick={add}>
            <Plus size={12} /> {t('bot.addValue')}
          </Button>
        </div>
      </Field>
      <Field label="Match type">
        <NativeSelect
          value={value?.match_type || 'contains'}
          onChange={(e) => onChange({ ...value, match_type: e.target.value })}
        >
          <option value="exact">{t('bot.match.exact')}</option>
          <option value="contains">{t('bot.match.contains')}</option>
          <option value="regex">{t('bot.match.regex')}</option>
        </NativeSelect>
      </Field>
      <Checkbox
        className="rounded focus-within:ring-2 focus-within:ring-ring"
        label={t('bot.caseSensitive')}
        checked={!!value?.case_sensitive}
        onChange={(event) => onChange({ ...value, case_sensitive: event.target.checked })}
      />
    </>
  );
}

function ReferralLinkConfig({ value, onChange, draft, setDraft }) {
  const { t } = useLanguage();
  const codes = Array.isArray(value?.referral_codes) ? value.referral_codes : [];

  return (
    <Field label="Referral codes">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {codes.map((c, i) => (
          <span key={i} style={kwChip}>
            {c}
            <Button
              variant="secondary"
              size="sm"
              type="button"
              aria-label={t('bot.removeValue', { value: c })}
              onClick={() =>
                onChange({ ...value, referral_codes: codes.filter((_, idx) => idx !== i) })
              }
            >
              <X size={10} />
            </Button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Input
          label={t('bot.referralDraft')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onChange({ ...value, referral_codes: [...codes, draft.trim()] });
              setDraft('');
              e.preventDefault();
            }
          }}
          placeholder="LP_REAL_ESTATE_2024"
        />
      </div>
      <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
        Use these codes in your <code>wa.me/&lt;number&gt;?text=…</code> tracking URLs. The bot
        triggers when an inbound message carries the referral code.
      </p>
    </Field>
  );
}

function ButtonReplyConfig({ value, onChange, draft, setDraft }) {
  const { t } = useLanguage();
  const payloads = Array.isArray(value?.button_payloads) ? value.button_payloads : [];

  return (
    <Field label="Button / list reply ids that trigger this flow">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {payloads.map((p, i) => (
          <span key={i} style={kwChip}>
            {p}
            <Button
              variant="secondary"
              size="sm"
              type="button"
              aria-label={`Remove ${p}`}
              onClick={() =>
                onChange({ ...value, button_payloads: payloads.filter((_, idx) => idx !== i) })
              }
            >
              <X size={10} />
            </Button>
          </span>
        ))}
      </div>
      <Input
        label={t('bot.buttonDraft')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) {
            onChange({ ...value, button_payloads: [...payloads, draft.trim()] });
            setDraft('');
            e.preventDefault();
          }
        }}
        placeholder="BUY_NOW, BOOK_DEMO"
      />
    </Field>
  );
}

function Field({ label, children }) {
  const { tr, t } = useLanguage();
  const title = FIELD_MESSAGES[label] ? t(FIELD_MESSAGES[label]) : tr(label);
  const fields = Children.toArray(children);
  if (
    fields.length === 1 &&
    isValidElement(fields[0]) &&
    [Input, NativeSelect].includes(fields[0].type)
  ) {
    return <div className="mb-3 min-w-0">{cloneElement(fields[0], { label: title })}</div>;
  }
  return (
    <fieldset className="mb-3 min-w-0 space-y-2">
      <legend className="ds-field-label">{title}</legend>
      {children}
    </fieldset>
  );
}

function Hint({ children }) {
  return (
    <p
      style={{
        margin: 0,
        padding: 12,
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 'var(--line-height-body)',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {children}
    </p>
  );
}

const kwChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 4px 3px 10px',
  background: 'var(--brand-primary-soft)',
  color: 'var(--brand-primary-hover)',
  border: '1px solid var(--brand-primary-glow)',
  borderRadius: 'var(--radius-pill)',
  fontSize: 12,
  fontWeight: 500,
};
