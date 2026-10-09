/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { useContext, useState, useEffect } from 'react';

import { Plus, X } from 'lucide-react';

import Input from '@/components/ui/Input';

import NativeSelect from '@/components/ui/NativeSelect';

import Checkbox from '@/components/ui/Checkbox';

import Button from '@/components/ui/Button';

import DataState from '@/components/ui/DataState';

import { useLanguage } from '@/i18n/index';

import VariableInserter from './VariableInserter';

import { botAPI } from '@/services/domains/bots';

import { OPS, ruleBox } from './InspectorFields';

import { DraftContext, useNumberDraft, Field, Hint, VariableTextarea } from './InspectorFields';

export function FormCondition({ data, patch }) {
  const { t } = useLanguage();
  // Normalise existing data.condition to compound shape so the UI can edit it
  const incoming = data.condition || {};
  const isCompound = incoming.operator === 'and' || incoming.operator === 'or';
  const condition = isCompound ? incoming : { operator: 'and', rules: [_leafFrom(incoming)] };

  function setCondition(c) {
    patch({ condition: c });
  }
  function setRule(i, p) {
    const rules = [...(condition.rules || [])];
    rules[i] = { ...rules[i], ...p };
    setCondition({ ...condition, rules });
  }
  function addRule() {
    setCondition({
      ...condition,
      rules: [...(condition.rules || []), { left: '', op: '==', right: '' }],
    });
  }
  function removeRule(i) {
    const rules = (condition.rules || []).filter((_, idx) => idx !== i);
    setCondition({ ...condition, rules });
  }

  return (
    <>
      <Hint>
        Wire two outputs from this node:&nbsp;
        <strong style={{ color: 'var(--success)' }}>true</strong> &amp;&nbsp;
        <strong style={{ color: 'var(--danger)' }}>false</strong>.
      </Hint>
      <Field label="Match">
        <NativeSelect
          value={condition.operator || 'and'}
          onChange={(e) => setCondition({ ...condition, operator: e.target.value })}
        >
          <option value="and">All conditions (AND)</option>
          <option value="or">Any condition (OR)</option>
        </NativeSelect>
      </Field>
      {(condition.rules || []).map((r, i) => (
        <div key={i} style={ruleBox}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 30px', gap: 4 }}>
            <Input
              label={t('bot.conditionLeft', { index: i + 1 })}
              value={r.left || ''}
              onChange={(e) => setRule(i, { left: e.target.value })}
              placeholder="variable_name"
            />
            <NativeSelect
              label={t('bot.conditionOperator', { index: i + 1 })}
              value={r.op || '=='}
              onChange={(e) => setRule(i, { op: e.target.value })}
            >
              {OPS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </NativeSelect>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => removeRule(i)}
              aria-label="Remove rule"
            >
              <X size={11} />
            </Button>
          </div>
          {!['is_empty', 'is_not_empty'].includes(r.op || '==') && (
            <Input
              label={t('bot.conditionRight', { index: i + 1 })}
              value={r.right ?? ''}
              onChange={(e) => setRule(i, { right: e.target.value })}
              placeholder="Compare to…"
            />
          )}
        </div>
      ))}
      <Button variant="secondary" size="sm" type="button" onClick={addRule}>
        <Plus size={11} /> Add condition
      </Button>
    </>
  );
}

function _leafFrom(c) {
  return { left: c.left || '', op: c.op || '==', right: c.right ?? '' };
}

export function FormRandomSplit() {
  return (
    <Hint>
      Wires multiple outgoing edges. Set a numeric <strong>weight</strong> on each edge (in the
      edge's data), or leave them all blank for equal probability. The engine picks one edge per
      run, weighted accordingly.
    </Hint>
  );
}

export function FormSetVariable({ data, patch, variables }) {
  return (
    <>
      <Field label="Variable name">
        <Input
          value={data.name || ''}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="utm_source"
        />
      </Field>
      <Field label="Value">
        <VariableTextarea
          value={data.value ?? ''}
          onChange={(v) => patch({ value: v })}
          variables={variables}
          rows={2}
          placeholder='Literal value or "{{first_name}} {{last_name}}"'
        />
      </Field>
      <Hint>
        Values can include {`{{var}}`} tokens — they're rendered against the live conversation
        state.
      </Hint>
    </>
  );
}

export function FormJumpToFlow({ data, patch }) {
  const { t } = useLanguage();
  const { workspace } = useContext(DraftContext);
  const [read, setRead] = useState({ loading: true, rows: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.resolve()
      .then(async () => {
        if (!workspace) throw new Error('Workspace required');
        const response = await botAPI.list(
          { workspace_id: workspace, active: '1' },
          controller.signal,
        );
        const rows = response.data?.results || response.data;
        if (
          !Array.isArray(rows) ||
          rows.some(
            (row) =>
              !Number.isInteger(row.id) || typeof row.name !== 'string' || row.is_active !== true,
          )
        )
          throw new Error('Invalid flows');
        if (active) setRead({ loading: false, rows, failed: false });
      })
      .catch(() => {
        if (active) setRead((previous) => ({ ...previous, loading: false, failed: true }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [workspace, attempt]);
  const flows = read.rows || [];
  return (
    <>
      {(read.loading || read.failed) && (
        <DataState
          compact
          state={read.failed ? 'error' : 'loading'}
          title={t(read.failed ? 'bot.jumpFailed' : 'meta.loading')}
          action={
            read.failed && (
              <Button onClick={() => setAttempt((value) => value + 1)}>{t('bot.retry')}</Button>
            )
          }
        />
      )}
      <Field label="Target flow">
        <NativeSelect
          value={data.target_flow_id || ''}
          onChange={(e) =>
            patch({ target_flow_id: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">Pick a flow…</option>
          {flows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} {f.is_active ? '· active' : ''}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Checkbox
        className="rounded focus-within:ring-2 focus-within:ring-ring"
        label={t('bot.field.carry_collected_variables_into_the_new_flow')}
        checked={!!data.carry_variables}
        onChange={(e) => patch({ carry_variables: e.target.checked })}
      />
      <Hint>
        This node ends the current conversation and starts the target flow with the same contact.
        Only active flows show up.
      </Hint>
    </>
  );
}

export function FormWaitDelay({ data, patch }) {
  const hours = useNumberDraft('hours', data.hours ?? 0, (value) => patch({ hours: value }), {
    min: 0,
  });
  const minutes = useNumberDraft(
    'minutes',
    data.minutes ?? 0,
    (value) => patch({ minutes: value }),
    { min: 0 },
  );
  const seconds = useNumberDraft(
    'seconds',
    data.seconds ?? 0,
    (value) => patch({ seconds: value }),
    { min: 0 },
  );
  return (
    <>
      <Hint>
        The bot pauses for this duration before continuing. Reminder: outside a 24-hour window, the
        next message must use a template.
      </Hint>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Field label="Hours">
          <Input inputMode="decimal" {...hours} />
        </Field>
        <Field label="Minutes">
          <Input inputMode="decimal" {...minutes} />
        </Field>
        <Field label="Seconds">
          <Input inputMode="decimal" {...seconds} />
        </Field>
      </div>
    </>
  );
}

export function FormTagContact({ data, patch, variables }) {
  const { t } = useLanguage();
  const tags = data.tags || [];
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v) return;
    patch({ tags: [...tags, v] });
    setDraft('');
  }
  function remove(i) {
    patch({ tags: tags.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <Field label="Tags to apply">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {tags.map((t, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 4px 3px 10px',
                background: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary-hover)',
                border: '1px solid var(--brand-primary-glow)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {t}
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${t}`}
              >
                <X size={10} />
              </Button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Input
            label={t('bot.tag')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add();
                e.preventDefault();
              }
            }}
            placeholder="hot-lead, real-estate, …"
          />
          <Button variant="secondary" size="sm" type="button" onClick={add} aria-label="Add tag">
            <Plus size={12} />
          </Button>
        </div>
        <div style={{ marginTop: 4 }}>
          <VariableInserter
            variables={variables}
            onPick={(v) => setDraft((d) => (d ? `${d}{{${v}}}` : `{{${v}}}`))}
          />
        </div>
      </Field>
      <Checkbox
        className="rounded focus-within:ring-2 focus-within:ring-ring"
        label={t('bot.field.remove_these_tags_instead_of_adding_them')}
        checked={!!data.remove}
        onChange={(e) => patch({ remove: e.target.checked })}
      />
    </>
  );
}

export function FormCaptureLead({ data, patch }) {
  const { t } = useLanguage();
  const fieldMap = data.field_map || {};
  const tags = data.tags || [];
  const [draftTag, setDraftTag] = useState('');
  const STANDARD = ['name', 'email', 'phone', 'interest', 'budget', 'location'];

  function setMap(key, varName) {
    patch({ field_map: { ...fieldMap, [key]: varName } });
  }

  return (
    <>
      <Hint>
        Persists the conversation as a Lead row. By default, variables matching a column name are
        mapped automatically. Override the mapping below if your variables are named differently.
      </Hint>
      <Field label="Field mapping (optional overrides)">
        {STANDARD.map((k) => (
          <div
            key={k}
            style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 6, marginBottom: 4 }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'center' }}>
              {k}
            </span>
            <Input
              label={t('bot.mapping', { field: k })}
              value={fieldMap[k] || ''}
              onChange={(e) => setMap(k, e.target.value)}
              placeholder={`Defaults to {{${k}}}`}
            />
          </div>
        ))}
      </Field>
      <Field label="Extra tags on the lead">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {tags.map((t, i) => (
            <span
              key={i}
              style={{
                padding: '2px 8px',
                background: 'var(--surface-sunken)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 11,
              }}
            >
              {t}{' '}
              <Button
                variant="secondary"
                size="sm"
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => patch({ tags: tags.filter((_, idx) => idx !== i) })}
              >
                <X size={9} />
              </Button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Input
            label={t('bot.tag')}
            value={draftTag}
            onChange={(e) => setDraftTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draftTag.trim()) {
                patch({ tags: [...tags, draftTag.trim()] });
                setDraftTag('');
                e.preventDefault();
              }
            }}
            placeholder="ctwa, real-estate"
          />
        </div>
      </Field>
    </>
  );
}
