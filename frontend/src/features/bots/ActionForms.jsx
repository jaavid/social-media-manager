/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { useState, useEffect, useRef } from 'react';

import { Wand2 } from 'lucide-react';

import Input from '@/components/ui/Input';

import Textarea from '@/components/ui/Textarea';

import NativeSelect from '@/components/ui/NativeSelect';

import Checkbox from '@/components/ui/Checkbox';

import Button from '@/components/ui/Button';

import Modal from '@/components/ui/Modal';

import DataState from '@/components/ui/DataState';

import { useLanguage } from '@/i18n/index';

import { apiError } from '@/services/http/errors';

import { aiPersonaAPI } from '@/services/domains/bots';

import {
  parseObject,
  useFieldDraft,
  useNumberDraft,
  Field,
  Hint,
  VariableTextarea,
} from './InspectorFields';

export function FormWebhook({ data, patch, variables }) {
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

export function FormSendEmail({ data, patch, variables }) {
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

export function FormAIChat({ data, patch, variables }) {
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

export function FormHandoff({ data, patch, variables }) {
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

export function FormGeneric({ data, replace }) {
  const { t } = useLanguage();
  const draft = useFieldDraft('json', JSON.stringify(data, null, 2), replace, parseObject, {
    onBlur: true,
  });
  return (
    <Textarea
      label={t('bot.rawJson')}
      hint={t('bot.jsonHint')}
      autoResize={false}
      dir="ltr"
      data-ltr="true"
      minRows={14}
      {...draft}
    />
  );
}
