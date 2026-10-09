/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { Plus, X } from 'lucide-react';

import Input from '@/components/ui/Input';

import Button from '@/components/ui/Button';

import { useLanguage } from '@/i18n/index';

import VariableInserter from './VariableInserter';

import { sectionBox } from './InspectorFields';

import { useNumberDraft, Field, Hint, VariableTextarea } from './InspectorFields';

export function FormMessageText({ data, patch, variables }) {
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

export function FormButtons({ data, patch, variables }) {
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

export function FormAsk({ type, data, patch, variables }) {
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

export function FormEnd({ data, patch, variables }) {
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

export function FormMedia({ type, data, patch, variables }) {
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

export function FormTemplate({ data, patch, variables }) {
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

export function FormList({ data, patch, variables }) {
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

export function FormCTA({ data, patch, variables }) {
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
