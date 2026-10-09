/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { useState } from 'react';

import { Trash2 } from 'lucide-react';

import Button from '@/components/ui/Button';

import { useLanguage } from '@/i18n/index';

import { getNodeMeta } from './nodeCatalog';

import { DraftContext, Hint, EmptyState } from './InspectorFields';

import {
  FormMessageText,
  FormButtons,
  FormAsk,
  FormEnd,
  FormMedia,
  FormTemplate,
  FormList,
  FormCTA,
} from './MessageForms';

import {
  FormCondition,
  FormRandomSplit,
  FormSetVariable,
  FormJumpToFlow,
  FormWaitDelay,
  FormTagContact,
  FormCaptureLead,
} from './LogicForms';

import { FormWebhook, FormSendEmail, FormAIChat, FormHandoff, FormGeneric } from './ActionForms';

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
            disabled={disabled}
            onClick={onDelete}
            aria-label={t('editor.deleteNode')}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </header>

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <DraftContext.Provider
          value={{ owner: node.id, drafts, onDraftChange, workspace: workspaceId }}
        >
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
