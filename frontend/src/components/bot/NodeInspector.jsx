/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * NodeInspector — right-side form panel for the currently-selected node.
 *
 * The five "primary" node types have first-class forms (spec):
 * message_text · message_buttons · ask_question · condition · end_conversation
 *
 * Every other type falls through to a generic JSON-edit textarea so the
 * editor never blocks you on a node it doesn't know about. fills
 * in dedicated forms for the remaining types.
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import { Plus, Trash2, X, Wand2 } from 'lucide-react';

import Input from '@/components/ui/Input';
import { FIELD_MESSAGES } from './editorMessages';
import Textarea from '@/components/ui/Textarea';
import NativeSelect from '@/components/ui/NativeSelect';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';
import { useLanguage } from '@/i18n';
import { apiError } from '@/services/http/errors';
import { getNodeMeta } from './nodeCatalog';
import VariableInserter from './VariableInserter';
import { aiPersonaAPI, botAPI } from '@/services/domains/bots';
const DraftContext = createContext(null);

function parseObject(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Invalid object');
  return parsed;
}

// Drafts belong to node + field, independently of whichever node is selected now.
function useFieldDraft(name, initial, commit, parse, { onBlur = false } = {}) {
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
function useNumberDraft(name, value, commit, { min, max, optional = false, integer = false } = {}) {
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

export default function NodeInspector({
  node,
  onChange,
  onDelete,
  variables = [],
  disabled = false,
  workspaceId,
  drafts: controlledDrafts,
  onDraftChange: controlledDraftChange,
}) {
  const { t } = useLanguage();
  const [localDrafts, setLocalDrafts] = useState({});
  const drafts = controlledDrafts || localDrafts;
  const onDraftChange =
    controlledDraftChange ||
    ((owner, field, entry) =>
      setLocalDrafts((previous) => ({
        ...previous,
        [owner]: { ...previous[owner], [field]: entry },
      })));
  if (!node) return <EmptyState />;
  const meta = getNodeMeta(node.data.type);
  const Icon = meta.icon;
  const data = node.data.data || {};

  function patch(p) {
    onChange({ ...node.data.data, ...p }, node.id);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-sm)',
            background: `${meta.color}22`,
            color: meta.color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {meta.category}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {meta.label}
          </div>
        </div>
        {node.data.type !== 'start' && (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            disabled={disabled} onClick={onDelete}
            aria-label={t('editor.deleteNode')}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </header>

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <DraftContext.Provider value={{ owner: node.id, drafts, onDraftChange, workspace: workspaceId }}>
          <fieldset disabled={disabled} className="min-w-0">
            <Form
              key={`${node.id}:${node.data.type}`}
              type={node.data.type}
              data={data}
              patch={patch}
              replace={(next) => onChange(next, node.id)}
              variables={variables}
            />
          </fieldset>
        </DraftContext.Provider>
      </div>
    </div>
  );
}

function Form({ type, data, patch, replace, variables }) {
  switch (type) {
    case 'start':
      return <Hint>Flow entry point — only one per flow. Connect this to the first action.</Hint>;
    case 'message_text':
      return <FormMessageText data={data} patch={patch} variables={variables} />;
    case 'message_image':
    case 'message_video':
    case 'message_document':
      return <FormMedia type={type} data={data} patch={patch} variables={variables} />;
    case 'message_template':
      return <FormTemplate data={data} patch={patch} variables={variables} />;
    case 'message_buttons':
      return <FormButtons data={data} patch={patch} variables={variables} />;
    case 'message_list':
      return <FormList data={data} patch={patch} variables={variables} />;
    case 'message_cta':
      return <FormCTA data={data} patch={patch} variables={variables} />;

    case 'ask_question':
    case 'ask_email':
    case 'ask_phone':
    case 'ask_number':
    case 'ask_location':
    case 'ask_attachment':
      return <FormAsk type={type} data={data} patch={patch} variables={variables} />;

    case 'condition':
      return <FormCondition data={data} patch={patch} variables={variables} />;
    case 'random_split':
      return <FormRandomSplit />;
    case 'set_variable':
      return <FormSetVariable data={data} patch={patch} variables={variables} />;
    case 'jump_to_flow':
      return <FormJumpToFlow data={data} patch={patch} />;
    case 'wait_delay':
      return <FormWaitDelay data={data} patch={patch} />;

    case 'tag_contact':
      return <FormTagContact data={data} patch={patch} variables={variables} />;
    case 'capture_lead':
      return <FormCaptureLead data={data} patch={patch} />;
    case 'webhook':
      return <FormWebhook data={data} patch={patch} variables={variables} />;
    case 'send_email':
      return <FormSendEmail data={data} patch={patch} variables={variables} />;

    case 'ai_chat':
      return <FormAIChat data={data} patch={patch} variables={variables} />;
    case 'human_handoff':
      return <FormHandoff data={data} patch={patch} variables={variables} />;

    case 'end_conversation':
      return <FormEnd data={data} patch={patch} variables={variables} />;
    default:
      return <FormGeneric data={data} replace={replace} />;
  }
}

// ─────────────────────────────────────────────────────────
// 1. message_text
// ─────────────────────────────────────────────────────────
function FormMessageText({ data, patch, variables }) {
  return (
    <>
      <Field label="Message">
        <VariableTextarea
          fieldName="text"
          required
          value={data.text || ''}
          onChange={(v) => patch({ text: v })}
          variables={variables}
          rows={5}
          placeholder='Hi {{contact.name|default:"there"}}!'
        />
      </Field>
      <WhatsAppPreview body={data.text} />
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 2. message_buttons
// ─────────────────────────────────────────────────────────
function FormButtons({ data, patch, variables }) {
  const { t } = useLanguage();
  const buttons = Array.isArray(data.buttons) ? data.buttons : [];
  function setBtn(i, p) {
    const next = [...buttons];
    next[i] = { ...next[i], ...p };
    patch({ buttons: next });
  }
  function add() {
    if (buttons.length >= 3) return;
    patch({
      buttons: [
        ...buttons,
        { id: `OPT_${buttons.length + 1}`, title: `Option ${buttons.length + 1}` },
      ],
    });
  }
  function remove(i) {
    patch({ buttons: buttons.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <Field label="Body">
        <VariableTextarea
          fieldName="body"
          required
          value={data.body || ''}
          onChange={(v) => patch({ body: v })}
          variables={variables}
          rows={3}
        />
      </Field>
      <Field label="Variable to store choice in">
        <Input
          value={data.store_var || ''}
          onChange={(e) => patch({ store_var: e.target.value })}
          placeholder="choice"
        />
      </Field>
      <Field label={t('bot.buttonsCount', { count: buttons.length })}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {buttons.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 30px', gap: 6 }}>
              <Input
                label={t('bot.buttonId', { index: i + 1 })}
                value={b.id || ''}
                onChange={(e) => setBtn(i, { id: e.target.value })}
                placeholder="OPT_A"
              />
              <Input
                label={t('bot.buttonTitle', { index: i + 1 })}
                value={b.title || ''}
                onChange={(e) => setBtn(i, { title: e.target.value })}
                placeholder="Option A"
                maxLength={20}
              />
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove button"
              >
                <X size={13} />
              </Button>
            </div>
          ))}
          {buttons.length < 3 && (
            <Button variant="secondary" size="sm" type="button" onClick={add}>
              <Plus size={13} /> Add button
            </Button>
          )}
        </div>
      </Field>
      <WhatsAppPreview body={data.body} buttons={buttons.map((b) => b.title)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 3. ask_*
// ─────────────────────────────────────────────────────────
function FormAsk({ type, data, patch, variables }) {
  const isNumber = type === 'ask_number';
  const minimum = useNumberDraft('min', data.min, (value) => patch({ min: value }), {
    optional: true,
    max: data.max ?? undefined,
  });
  const maximum = useNumberDraft('max', data.max, (value) => patch({ max: value }), {
    optional: true,
    min: data.min ?? undefined,
  });
  return (
    <>
      <Field label="Question to send">
        <VariableTextarea
          value={data.question || ''}
          onChange={(v) => patch({ question: v })}
          variables={variables}
          rows={3}
        />
      </Field>
      <Field label="Variable to store answer in">
        <Input
          value={data.store_var || ''}
          onChange={(e) => patch({ store_var: e.target.value })}
          placeholder={
            type === 'ask_email'
              ? 'email'
              : type === 'ask_phone'
                ? 'phone'
                : type === 'ask_number'
                  ? 'amount'
                  : type === 'ask_location'
                    ? 'location'
                    : type === 'ask_attachment'
                      ? 'attachment'
                      : 'answer'
          }
        />
      </Field>
      <Field label="Retry message if invalid">
        <Input
          value={data.retry_message || ''}
          onChange={(e) => patch({ retry_message: e.target.value })}
          placeholder="Defaults to a sensible message per ask type"
        />
      </Field>
      {isNumber && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Min (optional)">
            <Input inputMode="decimal" {...minimum} />
          </Field>
          <Field label="Max (optional)">
            <Input inputMode="decimal" {...maximum} />
          </Field>
        </div>
      )}
      <WhatsAppPreview body={data.question} />
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 4. condition (compound AND/OR builder)
// ─────────────────────────────────────────────────────────
const OPS = [
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

function FormCondition({ data, patch }) {
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

// ─────────────────────────────────────────────────────────
// 5. end_conversation
// ─────────────────────────────────────────────────────────
function FormEnd({ data, patch, variables }) {
  return (
    <>
      <Hint>Optionally send a final message before ending the bot run.</Hint>
      <Field label="Closing message (optional)">
        <VariableTextarea
          value={data.text || ''}
          onChange={(v) => patch({ text: v })}
          variables={variables}
          rows={3}
          placeholder="Thanks! Our team will reach out shortly."
        />
      </Field>
      {data.text && <WhatsAppPreview body={data.text} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 6. message_image / message_video / message_document
// ─────────────────────────────────────────────────────────
function FormMedia({ type, data, patch, variables }) {
  return (
    <>
      <Field
        label={
          type === 'message_video'
            ? 'Video URL'
            : type === 'message_document'
              ? 'Document URL'
              : 'Image URL'
        }
      >
        <Input
          value={data.url || ''}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://…"
        />
      </Field>
      {type === 'message_document' && (
        <Field label="Filename (shown to user)">
          <Input
            value={data.filename || ''}
            onChange={(e) => patch({ filename: e.target.value })}
            placeholder="brochure.pdf"
          />
        </Field>
      )}
      <Field label={type === 'message_document' ? 'Caption' : 'Caption (optional)'}>
        <VariableTextarea
          value={data.caption || ''}
          onChange={(v) => patch({ caption: v })}
          variables={variables}
          rows={2}
        />
      </Field>
      <Hint>
        Public URL or a Pinbot media_id. The 24-hour window applies — outside it, use a Send
        Template node instead.
      </Hint>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 7. message_template
// ─────────────────────────────────────────────────────────
function FormTemplate({ data, patch, variables }) {
  const { t } = useLanguage();
  const components = Array.isArray(data.components) ? data.components : [];

  function setComponent(i, p) {
    const next = [...components];
    next[i] = { ...next[i], ...p };
    patch({ components: next });
  }
  function addBody() {
    patch({
      components: [...components, { type: 'body', parameters: [{ type: 'text', text: '' }] }],
    });
  }
  function setBodyParam(i, j, text) {
    const next = [...components];
    const params = [...(next[i].parameters || [])];
    params[j] = { type: 'text', text };
    next[i] = { ...next[i], parameters: params };
    patch({ components: next });
  }

  return (
    <>
      <Field label="Template name (must be approved)">
        <Input
          value={data.template_name || ''}
          onChange={(e) => patch({ template_name: e.target.value })}
          placeholder="welcome_offer_v2"
        />
      </Field>
      <Field label="Language">
        <Input
          value={data.language || 'en_US'}
          onChange={(e) => patch({ language: e.target.value })}
          placeholder="en_US"
        />
      </Field>
      <Field label="Body parameters">
        {components.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
            No body parameters. Click "Add body parameter" if your template uses {'{{1}}'},{' '}
            {'{{2}}'}, etc.
          </div>
        )}
        {components.map(
          (c, i) =>
            c.type === 'body' && (
              <div key={i} style={{ marginBottom: 8 }}>
                {(c.parameters || []).map((p, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        width: 32,
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        alignSelf: 'center',
                        textAlign: 'center',
                      }}
                    >
                      {`{{${j + 1}}}`}
                    </span>
                    <Input
                      label={t('bot.parameter', { index: j + 1 })}
                      value={p.text || ''}
                      onChange={(e) => setBodyParam(i, j, e.target.value)}
                      placeholder="Variable or literal"
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setComponent(i, {
                      parameters: [...(c.parameters || []), { type: 'text', text: '' }],
                    })
                  }
                >
                  <Plus size={11} /> Add parameter
                </Button>
              </div>
            ),
        )}
        {!components.some((c) => c.type === 'body') && (
          <Button variant="secondary" size="sm" type="button" onClick={addBody}>
            <Plus size={11} /> Add body parameter
          </Button>
        )}
      </Field>
      <Hint>
        Required when sending outside the 24-hour conversation window. The template must be
        pre-approved on Pinbot.
      </Hint>
      <div style={{ marginTop: 4 }}>
        <VariableInserter variables={variables} onPick={() => {}} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 8. message_list
// ─────────────────────────────────────────────────────────
function FormList({ data, patch, variables }) {
  const { t } = useLanguage();
  const sections = Array.isArray(data.sections) ? data.sections : [];
  function setSection(i, p) {
    const next = [...sections];
    next[i] = { ...next[i], ...p };
    patch({ sections: next });
  }
  function addSection() {
    patch({ sections: [...sections, { title: 'Section', rows: [{ id: 'r1', title: 'Row 1' }] }] });
  }
  function removeSection(i) {
    patch({ sections: sections.filter((_, idx) => idx !== i) });
  }
  function setRow(si, ri, p) {
    const next = [...sections];
    const rows = [...(next[si].rows || [])];
    rows[ri] = { ...rows[ri], ...p };
    next[si] = { ...next[si], rows };
    patch({ sections: next });
  }
  function addRow(si) {
    const next = [...sections];
    const rows = [...(next[si].rows || [])];
    rows.push({ id: `r${rows.length + 1}`, title: `Row ${rows.length + 1}` });
    next[si] = { ...next[si], rows };
    patch({ sections: next });
  }
  function removeRow(si, ri) {
    const next = [...sections];
    next[si] = { ...next[si], rows: (next[si].rows || []).filter((_, idx) => idx !== ri) };
    patch({ sections: next });
  }

  return (
    <>
      <Field label="Body">
        <VariableTextarea
          value={data.body || ''}
          onChange={(v) => patch({ body: v })}
          variables={variables}
          rows={3}
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Field label="Button label">
          <Input
            value={data.button_label || 'Choose'}
            onChange={(e) => patch({ button_label: e.target.value })}
            maxLength={20}
          />
        </Field>
        <Field label="Store choice in">
          <Input
            value={data.store_var || ''}
            onChange={(e) => patch({ store_var: e.target.value })}
            placeholder="choice"
          />
        </Field>
      </div>
      <Field label="Sections">
        {sections.map((s, si) => (
          <div key={si} style={sectionBox}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <Input
                label={t('bot.sectionTitle', { index: si + 1 })}
                value={s.title || ''}
                onChange={(e) => setSection(si, { title: e.target.value })}
                placeholder="Section title"
              />
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => removeSection(si)}
                aria-label="Remove section"
              >
                <X size={12} />
              </Button>
            </div>
            {(s.rows || []).map((r, ri) => (
              <div
                key={ri}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 30px',
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <Input
                  label={t('bot.rowId', { index: ri + 1 })}
                  value={r.id || ''}
                  onChange={(e) => setRow(si, ri, { id: e.target.value })}
                  placeholder="row_id"
                />
                <Input
                  label={t('bot.rowTitle', { index: ri + 1 })}
                  value={r.title || ''}
                  onChange={(e) => setRow(si, ri, { title: e.target.value })}
                  maxLength={24}
                  placeholder="Row title"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => removeRow(si, ri)}
                  aria-label="Remove row"
                >
                  <X size={11} />
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" type="button" onClick={() => addRow(si)}>
              <Plus size={11} /> Add row
            </Button>
          </div>
        ))}
        <Button variant="secondary" size="sm" type="button" onClick={addSection}>
          <Plus size={11} /> Add section
        </Button>
      </Field>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 9. message_cta
// ─────────────────────────────────────────────────────────
function FormCTA({ data, patch, variables }) {
  return (
    <>
      <Field label="Body">
        <VariableTextarea
          value={data.body || ''}
          onChange={(v) => patch({ body: v })}
          variables={variables}
          rows={3}
        />
      </Field>
      <Field label="URL">
        <Input
          value={data.url || ''}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://yourbiz.com/learn"
        />
      </Field>
      <Field label="Button text">
        <Input
          value={data.button_text || 'Open'}
          onChange={(e) => patch({ button_text: e.target.value })}
          maxLength={20}
          placeholder="Open"
        />
      </Field>
      <Field label="Template name (optional — required outside 24h)">
        <Input
          value={data.template_name || ''}
          onChange={(e) => patch({ template_name: e.target.value })}
          placeholder="cta_url_template"
        />
      </Field>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 10. random_split
// ─────────────────────────────────────────────────────────
function FormRandomSplit() {
  return (
    <Hint>
      Wires multiple outgoing edges. Set a numeric <strong>weight</strong> on each edge (in the
      edge's data), or leave them all blank for equal probability. The engine picks one edge per
      run, weighted accordingly.
    </Hint>
  );
}

// ─────────────────────────────────────────────────────────
// 11. set_variable
// ─────────────────────────────────────────────────────────
function FormSetVariable({ data, patch, variables }) {
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

// ─────────────────────────────────────────────────────────
// 12. jump_to_flow
// ─────────────────────────────────────────────────────────
function FormJumpToFlow({ data, patch }) {
  const { t } = useLanguage();
  const { workspace } = useContext(DraftContext);
  const [read, setRead] = useState({ loading: true, rows: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      if (!workspace) throw new Error('Workspace required');
      const response = await botAPI.list({ workspace_id: workspace, active: '1' }, controller.signal);
      const rows = response.data?.results || response.data;
      if (!Array.isArray(rows) || rows.some(row => !Number.isInteger(row.id) || typeof row.name !== 'string' || row.is_active !== true)) throw new Error('Invalid flows');
      if (active) setRead({ loading: false, rows, failed: false });
    }).catch(() => { if (active) setRead(previous => ({ ...previous, loading: false, failed: true })); });
    return () => { active = false; controller.abort(); };
  }, [workspace, attempt]);
  const flows = read.rows || [];
  return (
    <>
      {(read.loading || read.failed) && <DataState compact state={read.failed ? 'error' : 'loading'} title={t(read.failed ? 'bot.jumpFailed' : 'meta.loading')}
        action={read.failed && <Button onClick={() => setAttempt(value => value + 1)}>{t('bot.retry')}</Button>} />}
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

// ─────────────────────────────────────────────────────────
// 13. wait_delay
// ─────────────────────────────────────────────────────────
function FormWaitDelay({ data, patch }) {
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

// ─────────────────────────────────────────────────────────
// 14. tag_contact
// ─────────────────────────────────────────────────────────
function FormTagContact({ data, patch, variables }) {
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

// ─────────────────────────────────────────────────────────
// 15. capture_lead
// ─────────────────────────────────────────────────────────
function FormCaptureLead({ data, patch }) {
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

// ─────────────────────────────────────────────────────────
// 16. webhook
// ─────────────────────────────────────────────────────────
function FormWebhook({ data, patch, variables }) {
  const { t } = useLanguage();
  const headers = useFieldDraft(
    'headers',
    JSON.stringify(data.headers || {}, null, 2),
    (value) => patch({ headers: value }),
    parseObject,
    { onBlur: true },
  );
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 6 }}>
        <Field label="Method">
          <NativeSelect
            value={data.method || 'POST'}
            onChange={(e) => patch({ method: e.target.value })}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </NativeSelect>
        </Field>
        <Field label="URL">
          <Input
            value={data.url || ''}
            onChange={(e) => patch({ url: e.target.value })}
            placeholder="https://hooks.slack.com/…"
          />
        </Field>
      </div>
      <Field label="Headers (JSON)">
        <Textarea autoResize={false} dir="ltr" data-ltr="true" {...headers} rows={3} />
      </Field>
      <Field label="Body template (rendered with {{vars}})">
        <VariableTextarea
          value={data.body_template || ''}
          onChange={(v) => patch({ body_template: v })}
          variables={variables}
          rows={4}
          placeholder='{"name":"{{name}}","budget":"{{budget}}"}'
        />
      </Field>
      <Checkbox
        className="rounded focus-within:ring-2 focus-within:ring-ring"
        label={t('bot.field.include_all_collected_variables_in_the_request_body')}
        checked={data.include_variables ?? true}
        onChange={(e) => patch({ include_variables: e.target.checked })}
      />
      <Hint>
        Wires both <strong>success</strong> and <strong>failure</strong> outgoing edges so you can
        branch on the response.
      </Hint>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 17. send_email
// ─────────────────────────────────────────────────────────
function FormSendEmail({ data, patch, variables }) {
  return (
    <>
      <Field label="To (comma-separated)">
        <Input
          value={Array.isArray(data.to) ? data.to.join(', ') : data.to || ''}
          onChange={(e) => patch({ to: e.target.value })}
          placeholder="agency@example.com, sales@example.com"
        />
      </Field>
      <Field label="Subject">
        <VariableTextarea
          value={data.subject || ''}
          onChange={(v) => patch({ subject: v })}
          variables={variables}
          rows={1}
          placeholder="New lead: {{name}}"
        />
      </Field>
      <Field label="Body (plain text)">
        <VariableTextarea
          value={data.body || ''}
          onChange={(v) => patch({ body: v })}
          variables={variables}
          rows={6}
        />
      </Field>
      <Hint>
        Outbound from <code>DEFAULT_FROM_EMAIL</code> unless you set <code>from_email</code> in raw
        JSON. Send goes through Django's mail backend.
      </Hint>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 18. ai_chat
// ─────────────────────────────────────────────────────────
function FormAIChat({ data, patch, variables }) {
  const { t } = useLanguage();
  const turns = useNumberDraft(
    'max_turns',
    data.max_turns ?? 12,
    (value) => patch({ max_turns: value }),
    { min: 1, max: 50, integer: true },
  );
  const tokens = useNumberDraft(
    'max_tokens',
    data.max_tokens ?? 256,
    (value) => patch({ max_tokens: value }),
    { min: 32, max: 1024, integer: true },
  );
  const exitWords = (data.exit_keywords || []).join(', ');
  const [wizardOpen, setWizardOpen] = useState(false);
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Button variant="secondary" size="sm" type="button" onClick={() => setWizardOpen(true)}>
            <Wand2 size={10} /> Build with AI
          </Button>
        </div>
        <VariableTextarea
          label={t('bot.field.persona_system_prompt')}
          value={data.persona || ''}
          onChange={(v) => patch({ persona: v })}
          variables={variables}
          rows={5}
          placeholder="You are a friendly real-estate consultant for Acme Properties. Reply in under 60 words…"
        />
      </div>
      {wizardOpen && (
        <PersonaWizard
          onClose={() => setWizardOpen(false)}
          onApply={(persona) => {
            patch({ persona });
            setWizardOpen(false);
          }}
        />
      )}
      <Field label="Opening message (optional)">
        <VariableTextarea
          value={data.opening_message || ''}
          onChange={(v) => patch({ opening_message: v })}
          variables={variables}
          rows={2}
          placeholder="Sure — how can I help?"
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Max turns before exit">
          <Input inputMode="numeric" {...turns} />
        </Field>
        <Field label="Max tokens / reply">
          <Input inputMode="numeric" {...tokens} />
        </Field>
      </div>
      <Field label="Exit keywords (comma-separated)">
        <Input
          value={exitWords}
          onChange={(e) =>
            patch({
              exit_keywords: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="stop, agent, human"
        />
      </Field>
      <Hint>
        Uses our fast tier by default — quick responses, low cost. The user can exit by typing any
        of the keywords above (defaults: stop, agent, human, staff).
      </Hint>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Persona builder wizard — modal launched from FormAIChat
// ─────────────────────────────────────────────────────────
function PersonaWizard({ onClose, onApply }) {
  const { t } = useLanguage();
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [whatYouDo, setWhatYouDo] = useState('');
  const [tone, setTone] = useState('friendly, professional');
  const [noGo, setNoGo] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [failure, setFailure] = useState(null);
  const pending = useRef(false),
    alive = useRef(true),
    errorRef = useRef(null),
    nameRef = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);
  async function go() {
    if (pending.current) return;
    if (!businessName.trim()) {
      nameRef.current?.focus();
      nameRef.current?.reportValidity();
      return;
    }
    pending.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const response = await aiPersonaAPI.build({
        business_name: businessName.trim(),
        industry: industry || undefined,
        what_you_do: whatYouDo || undefined,
        tone: tone || undefined,
        no_go_topics: noGo
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      if (typeof response.data?.persona !== 'string' || !response.data.persona.trim())
        throw new Error('Invalid persona');
      if (alive.current) setDraft(response.data.persona);
    } catch (error) {
      if (alive.current) setFailure(apiError(error));
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Modal
      open
      title={t('bot.personaBuilder')}
      initialFocusRef={nameRef}
      onClose={() => {
        if (!pending.current) onClose();
      }}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            {t('reports.cancel')}
          </Button>
          <Button loading={busy} onClick={go}>
            {t('bot.buildPersona')}
          </Button>
          {draft && (
            <Button disabled={busy || !draft.trim()} onClick={() => onApply(draft)}>
              {t('bot.applyPersona')}
            </Button>
          )}
        </>
      }
    >
      {failure && (
        <DataState
          focusRef={errorRef}
          compact
          state="error"
          title={t('bot.personaFailed')}
          referenceId={failure.referenceId}
        />
      )}
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <Input
          ref={nameRef}
          required
          label={t('bot.businessName')}
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
        />
        <NativeSelect
          label={t('bot.industry')}
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
        >
          <option value="">—</option>
          {[
            'real-estate',
            'healthcare',
            'restaurant',
            'fitness',
            'ecommerce',
            'education',
            'services',
          ].map((value) => (
            <option key={value} value={value}>
              {t(`bot.industryOptions.${value}`)}
            </option>
          ))}
        </NativeSelect>
        <Textarea
          label={t('bot.businessDescription')}
          value={whatYouDo}
          onChange={(event) => setWhatYouDo(event.target.value)}
        />
        <Input
          label={t('bot.tone')}
          value={tone}
          onChange={(event) => setTone(event.target.value)}
        />
        <Input
          label={t('bot.noGo')}
          value={noGo}
          onChange={(event) => setNoGo(event.target.value)}
        />
        {draft && (
          <Textarea
            label={t('bot.personaDraft')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            minRows={5}
          />
        )}
      </fieldset>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// 19. human_handoff
// ─────────────────────────────────────────────────────────
function FormHandoff({ data, patch, variables }) {
  const assignee = useNumberDraft(
    'assignee_user_id',
    data.assignee_user_id,
    (value) => patch({ assignee_user_id: value }),
    { optional: true, min: 1, integer: true },
  );
  return (
    <>
      <Field label="Final message to the user">
        <VariableTextarea
          value={data.message || ''}
          onChange={(v) => patch({ message: v })}
          variables={variables}
          rows={3}
          placeholder="Connecting you to a teammate — they'll reply shortly."
        />
      </Field>
      <Field label="Assign to user id (optional)">
        <Input inputMode="numeric" {...assignee} placeholder="Leave blank for round-robin" />
      </Field>
      <Hint>
        This terminates the bot's run. The conversation status flips to <strong>handed_off</strong>{' '}
        and the chosen agent gets notified via the Stage-13 dispatcher.
      </Hint>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Generic JSON editor for not-yet-implemented inspectors
// ─────────────────────────────────────────────────────────
function FormGeneric({ data, replace }) {
  const { t } = useLanguage();
  const draft = useFieldDraft('json', JSON.stringify(data, null, 2), replace, parseObject, {
    onBlur: true,
  });
  return (
    <Textarea
      label={t('bot.rawJson')}
      hint={t('bot.jsonHint')}
      autoResize={false}
      dir="ltr" data-ltr="true"
      minRows={14}
      {...draft}
    />
  );
}

// ─────────────────────────────────────────────────────────
// Reusable small components
// ─────────────────────────────────────────────────────────

function Field({ label, children }) {
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

function Hint({ children }) {
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

function VariableTextarea({ label, value, onChange, variables, rows = 3, placeholder, required, fieldName }) {
  const { t, tr } = useLanguage();
  const { owner, onDraftChange } = useContext(DraftContext);
  const title = FIELD_MESSAGES[label] ? t(FIELD_MESSAGES[label]) : tr(label);
  function change(next) {
    if (required) onDraftChange(owner, `required:${fieldName}`, { text: next, valid: !!next.trim() });
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
        onChange={event => change(event.target.value)}
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

function WhatsAppPreview({ body, buttons }) {
  if (!body) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        Preview
      </div>
      <div
        style={{
          padding: 10,
          background: '#dcf8c6',
          color: '#1f2c34',
          borderRadius: '8px 8px 8px 2px',
          maxWidth: 240,
          fontSize: 13,
          lineHeight: 'var(--line-height-body)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {body}
        {buttons && buttons.length > 0 && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {buttons.map((b, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 12px',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  background: '#fff',
                  color: '#075e54',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 4,
                }}
              >
                {b}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 32, color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
      Click a node to edit it.
    </div>
  );
}

const sectionBox = {
  padding: 8,
  marginBottom: 8,
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
};

const ruleBox = {
  padding: 8,
  marginBottom: 8,
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
};
