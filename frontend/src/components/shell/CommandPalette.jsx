/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard, LineChart, FileText, Search, Send, Inbox, Users2,
  FileType, MessageCircle, Settings, Plus, Upload, Lightbulb, Wand2,
  TrendingUp, AlertCircle, CalendarDays,
  Sparkles, BookOpen, Activity, ShieldCheck, ExternalLink,
  MessageSquare, UserSquare,
} from 'lucide-react';

import { useClients } from '../../hooks/useData';
import useUnifiedSearch from '../../hooks/useUnifiedSearch';
import { useLanguage } from '../../i18n';

const RECENTS_KEY = 'cmdk:recents';
const RECENTS_MAX = 6;

export default function CommandPalette({ open, onOpenChange, basePath }) {
  const navigate = useNavigate();
  const [recents, setRecents] = useState(() => readRecents());
  const [inputValue, setInputValue] = useState('');
  const { clients } = useClients();
  const { tr } = useLanguage();

  const { results: searchResults, isFetching: searchFetching, debouncedQuery } =
    useUnifiedSearch(inputValue);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setInputValue('');
  }, [open]);

  const pages = localizeItems(buildPages(basePath), tr);
  const actions = localizeItems(buildActions(basePath), tr);
  const links = localizeItems(buildLinks(), tr);

  function pick(id, fn) {
    fn();
    addRecent(id);
    setRecents(readRecents());
    onOpenChange(false);
  }

  const hasSearchQuery = (debouncedQuery || '').trim().length >= 2;
  const hasSearchHits = hasSearchQuery && (searchResults.total > 0);

  if (!open) return null;

  return (
    <div
      className="ds-cmdk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={tr('Command palette')}
      onClick={() => onOpenChange(false)}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10, 14, 20, 0.5)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 500,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <Command
        label={tr('Command Menu')}
        loop
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <Search size={16} color="var(--text-tertiary)" />
          <Command.Input
            autoFocus
            value={inputValue}
            onValueChange={setInputValue}
            placeholder={tr('Search pages, posts, leads, conversations…')}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: 15, fontFamily: 'var(--font-sans)',
              color: 'var(--text-primary)',
              textAlign: 'start',
            }}
          />
          {searchFetching && (
            <span
              aria-label={tr('Searching')}
              style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
            >
              {tr('Searching…')}
            </span>
          )}
        </div>

        <Command.List style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 8px 12px' }}>
          <Command.Empty style={{
            padding: '32px 16px', textAlign: 'center',
            color: 'var(--text-tertiary)', fontSize: 13,
          }}>
            {tr('No results found.')}
          </Command.Empty>

          {hasSearchHits && (
            <SearchResultGroups
              results={searchResults}
              onPick={(id, link) => pick(id, () => navigate(link))}
            />
          )}

          {recents.length > 0 && !hasSearchQuery && (
            <Group heading={tr('Recent')}>
              {recents.map((r) => {
                const item = [...pages, ...actions].find((p) => p.id === r);
                if (!item) return null;
                return (
                  <Item key={item.id} item={item} onSelect={() => pick(item.id, item.run)} />
                );
              })}
            </Group>
          )}

          <Group heading={tr('Pages')}>
            {pages.map((p) => (
              <Item key={p.id} item={p} onSelect={() => pick(p.id, () => navigate(p.path))} />
            ))}
          </Group>

          <Group heading={tr('Quick actions')}>
            {actions.map((a) => (
              <Item key={a.id} item={a} onSelect={() => pick(a.id, a.run)} />
            ))}
          </Group>

          {(clients || []).length > 0 && (
            <Group heading={tr('Clients')}>
              {(clients || []).slice(0, 8).map((c) => (
                <Item
                  key={`client-${c.id}`}
                  item={{ id: `client-${c.id}`, label: c.company, hint: tr('Switch to client'), icon: Users2 }}
                  onSelect={() => pick(`client-${c.id}`, () => navigate(`/admin/client/${c.id}`))}
                />
              ))}
            </Group>
          )}

          <Group heading={tr('Help & resources')}>
            {links.map((l) => (
              <Item
                key={l.id}
                item={l}
                onSelect={() => pick(l.id, () => window.open(l.path, '_blank', 'noopener'))}
              />
            ))}
          </Group>
        </Command.List>

        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-sunken)',
          fontSize: 11, color: 'var(--text-tertiary)',
          display: 'flex', justifyContent: 'space-between', gap: 12,
        }}>
          <span>{tr('↑↓ to navigate · ↵ to select')}</span>
          <span>{tr('esc to close')}</span>
        </div>
      </Command>
    </div>
  );
}

function SearchResultGroups({ results, onPick }) {
  const { tr } = useLanguage();
  return (
    <>
      {(results.posts || []).length > 0 && (
        <Group heading={tr('Posts')}>
          {results.posts.map((p) => (
            <Item
              key={`s-post-${p.id}`}
              item={{
                id: `s-post-${p.id}`,
                label: p.title || p.preview || tr('Untitled post'),
                hint: `${tr('Post')} · ${p.status || 'draft'}`,
                icon: FileType,
              }}
              onSelect={() => onPick(`s-post-${p.id}`, p.deep_link)}
            />
          ))}
        </Group>
      )}
      {(results.leads || []).length > 0 && (
        <Group heading={tr('Leads')}>
          {results.leads.map((lead) => (
            <Item
              key={`s-lead-${lead.id}`}
              item={{
                id: `s-lead-${lead.id}`,
                label: lead.name || lead.phone || tr('Lead'),
                hint: `${tr('Lead')} · ${lead.status || 'new'}` + (lead.email ? ` · ${lead.email}` : ''),
                icon: UserSquare,
              }}
              onSelect={() => onPick(`s-lead-${lead.id}`, lead.deep_link)}
            />
          ))}
        </Group>
      )}
      {(results.conversations || []).length > 0 && (
        <Group heading={tr('Conversations')}>
          {results.conversations.map((conversation) => (
            <Item
              key={`s-conv-${conversation.id}`}
              item={{
                id: `s-conv-${conversation.id}`,
                label: conversation.contact || tr('(unknown)'),
                hint: `${conversation.platform || 'inbox'} · ${(conversation.preview || '').slice(0, 80)}`,
                icon: MessageSquare,
              }}
              onSelect={() => onPick(`s-conv-${conversation.id}`, conversation.deep_link)}
            />
          ))}
        </Group>
      )}
      {(results.contacts || []).length > 0 && (
        <Group heading={tr('Contacts')}>
          {results.contacts.map((contact) => (
            <Item
              key={`s-contact-${contact.id}`}
              item={{
                id: `s-contact-${contact.id}`,
                label: contact.name || contact.phone || tr('Contact'),
                hint: contact.phone || '',
                icon: Users2,
              }}
              onSelect={() => onPick(`s-contact-${contact.id}`, contact.deep_link)}
            />
          ))}
        </Group>
      )}
    </>
  );
}

function Group({ heading, children }) {
  return (
    <Command.Group
      heading={
        <span style={{
          display: 'inline-block', padding: '8px 8px 4px',
          fontSize: 11, fontWeight: 600,
          letterSpacing: 0.6, textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}>
          {heading}
        </span>
      }
    >
      {children}
    </Command.Group>
  );
}

function Item({ item, onSelect }) {
  const Icon = item.icon || Search;
  return (
    <Command.Item
      value={`${item.label} ${item.hint || ''} ${item.keywords || ''}`}
      onSelect={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        margin: '1px 0',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
        color: 'var(--text-primary)',
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-sunken)',
        color: 'var(--text-secondary)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={14} strokeWidth={2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 500 }}>{item.label}</span>
        {item.hint && (
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)' }}>
            {item.hint}
          </span>
        )}
      </span>
    </Command.Item>
  );
}

function localizeItems(items, tr) {
  return items.map((item) => ({
    ...item,
    label: tr(item.label),
    hint: item.hint ? tr(item.hint) : item.hint,
  }));
}

function buildPages(basePath) {
  return [
    { id: 'analytics-dashboard', label: 'Dashboard', hint: 'Analytics overview', icon: LayoutDashboard, path: `${basePath}/analytics/dashboard` },
    { id: 'analytics-analytics', label: 'Analytics', hint: 'Deep metrics', icon: LineChart, path: `${basePath}/analytics/analytics` },
    { id: 'analytics-reports', label: 'Reports', hint: 'PDF reports', icon: FileText, path: `${basePath}/analytics/reports` },
    { id: 'analytics-calendar', label: 'Content Calendar', hint: 'Plan & schedule', icon: CalendarDays, path: `${basePath}/analytics/calendar` },
    { id: 'analytics-roi', label: 'ROI Calculator', hint: 'Revenue forecasting', icon: TrendingUp, path: `${basePath}/analytics/roi` },
    { id: 'analytics-alerts', label: 'Alerts', hint: 'Anomaly notifications', icon: AlertCircle, path: `${basePath}/analytics/alerts` },
    { id: 'analytics-caption', label: 'Caption Writer', hint: 'AI-powered captions', icon: Wand2, path: `${basePath}/analytics/caption-writer` },
    { id: 'analytics-ideas', label: 'Post Ideas', hint: 'AI content brainstorm', icon: Lightbulb, path: `${basePath}/analytics/post-ideas` },
    { id: 'messaging-dashboard', label: 'Messaging dashboard', hint: 'WhatsApp overview', icon: MessageCircle, path: `${basePath}/messaging` },
    { id: 'messaging-inbox', label: 'Inbox', hint: 'Conversations', icon: Inbox, path: `${basePath}/messaging/inbox` },
    { id: 'messaging-campaigns', label: 'Campaigns', hint: 'Broadcast outreach', icon: Send, path: `${basePath}/messaging/campaigns` },
    { id: 'messaging-templates', label: 'Templates', hint: 'Approved templates', icon: FileType, path: `${basePath}/messaging/templates` },
    { id: 'messaging-contacts', label: 'Contacts', hint: 'Audience', icon: Users2, path: `${basePath}/messaging/contacts` },
    { id: 'messaging-account', label: 'Pinbot account', hint: 'WhatsApp setup', icon: Settings, path: `${basePath}/messaging/account` },
  ];
}

function buildActions(basePath) {
  return [
    {
      id: 'action-new-campaign',
      label: 'Send a message',
      hint: 'Open inbox to compose',
      icon: Send,
      run: () => location.assign(`${basePath}/messaging/inbox`),
    },
    {
      id: 'action-create-campaign',
      label: 'Create a campaign',
      hint: 'New broadcast',
      icon: Plus,
      run: () => location.assign(`${basePath}/messaging/campaigns?new=1`),
    },
    {
      id: 'action-upload-contacts',
      label: 'Upload contacts',
      hint: 'Import a CSV',
      icon: Upload,
      run: () => location.assign(`${basePath}/messaging/contacts?import=1`),
    },
    {
      id: 'action-new-template',
      label: 'Create a template',
      hint: 'WhatsApp template',
      icon: FileType,
      run: () => location.assign(`${basePath}/messaging/templates?new=1`),
    },
  ];
}

function buildLinks() {
  return [
    { id: 'link-changelog', label: "What's new", hint: 'Recent product updates', icon: Sparkles, path: '/changelog' },
    { id: 'link-help', label: 'Help center', hint: 'Guides + troubleshooting', icon: BookOpen, path: '/help' },
    { id: 'link-status', label: 'System status', hint: 'Live uptime + incidents', icon: Activity, path: '/status' },
    { id: 'link-security', label: 'Security & compliance', hint: 'GDPR, DPDP, certifications', icon: ShieldCheck, path: '/security' },
    { id: 'link-contact', label: 'Contact support', hint: 'Send us a message', icon: ExternalLink, path: '/contact' },
  ];
}

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw).slice(0, RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

function addRecent(id) {
  try {
    const list = readRecents().filter((x) => x !== id);
    list.unshift(id);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, RECENTS_MAX)));
  } catch {}
}
