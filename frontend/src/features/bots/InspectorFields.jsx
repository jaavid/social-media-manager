/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { Children, cloneElement, createContext, isValidElement, useContext } from 'react';

import Input from '@/components/ui/Input';

import { FIELD_MESSAGES } from './editorMessages';

import Textarea from '@/components/ui/Textarea';

import NativeSelect from '@/components/ui/NativeSelect';

import { useLanguage } from '@/i18n/index';

import VariableInserter from './VariableInserter';

export const DraftContext = createContext(null);

export function parseObject(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Invalid object');
  return parsed;
}

export function useFieldDraft(name, initial, commit, parse, { onBlur = false } = {}) {
  const { owner, drafts, onDraftChange } = useContext(DraftContext);
  const { t } = useLanguage();
  const entry = drafts[owner]?.[name];
  const text = entry && (!entry.valid || entry.snapshot === initial) ? entry.text : initial;
  function read(next) {
    try {
      return { value: parse(next), valid: true };
    } catch {
      return { valid: false };
    }
  }
  function update(next, blur) {
    const parsed = read(next);
    const valid = parsed.valid && (!onBlur || blur);
    onDraftChange(owner, name, {
      text: next,
      valid,
      error: !parsed.valid,
      snapshot: valid
        ? onBlur
          ? JSON.stringify(parsed.value, null, 2)
          : String(parsed.value ?? '')
        : undefined,
    });
    if (valid) commit(parsed.value);
  }
  return {
    value: text,
    onChange: (event) => update(event.target.value, false),
    onBlur: onBlur ? (event) => update(event.target.value, true) : undefined,
    error: entry?.error ? t(onBlur ? 'bot.invalidJson' : 'bot.invalidNumber') : undefined,
    hint: entry && !entry.valid && !entry.error ? t('bot.commitJson') : undefined,
  };
}

export function useNumberDraft(
  name,
  value,
  commit,
  { min, max, optional = false, integer = false } = {},
) {
  return useFieldDraft(name, String(value ?? ''), commit, (text) => {
    if (optional && text.trim() === '') return null;
    if (!text.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))
      throw new Error('Invalid number');
    const parsed = Number(text);
    if (
      !Number.isFinite(parsed) ||
      (integer && !Number.isInteger(parsed)) ||
      (min !== undefined && parsed < min) ||
      (max !== undefined && parsed > max)
    )
      throw new Error('Invalid number');
    return parsed;
  });
}

export function Field({ label, children }) {
  const { tr, t } = useLanguage();
  const title = FIELD_MESSAGES[label] ? t(FIELD_MESSAGES[label]) : tr(label);
  const fields = Children.toArray(children);
  if (
    fields.length === 1 &&
    isValidElement(fields[0]) &&
    [Input, Textarea, NativeSelect, VariableTextarea].includes(fields[0].type)
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

export function Hint({ children }) {
  return (
    <p
      style={{
        margin: '0 0 14px',
        fontSize: 12,
        color: 'var(--text-tertiary)',
        lineHeight: 'var(--line-height-body)',
        padding: 10,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {children}
    </p>
  );
}

export function VariableTextarea({
  label,
  value,
  onChange,
  variables,
  rows = 3,
  placeholder,
  required,
  fieldName,
}) {
  const { t, tr } = useLanguage();
  const { owner, onDraftChange } = useContext(DraftContext);
  const title = FIELD_MESSAGES[label] ? t(FIELD_MESSAGES[label]) : tr(label);
  function change(next) {
    if (required)
      onDraftChange(owner, `required:${fieldName}`, { text: next, valid: !!next.trim() });
    onChange(next);
  }
  return (
    <div style={{ position: 'relative' }}>
      <Textarea
        label={title}
        required={required}
        error={required && !value?.trim() ? t('bot.required') : undefined}
        autoResize={false}
        value={value}
        onChange={(event) => change(event.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
      <div style={{ marginTop: 4 }}>
        <VariableInserter
          variables={variables}
          onPick={(name) => change((value || '') + `{{${name}}}`)}
        />
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div style={{ padding: 32, color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
      Click a node to edit it.
    </div>
  );
}

export const OPS = [
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'contains',
  'starts_with',
  'ends_with',
  'regex_match',
  'is_empty',
  'is_not_empty',
];

export const sectionBox = {
  padding: 8,
  marginBottom: 8,
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
};

export const ruleBox = {
  padding: 8,
  marginBottom: 8,
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
};
