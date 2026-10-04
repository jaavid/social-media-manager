/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/DropdownMenu';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { useAppNavigate as useNavigate } from '../../core/navigation';
import { Bell, Settings, LogOut, Briefcase, Store } from 'lucide-react';
import { BrandMark } from '../ui/BrandLogo';
import AccountTypeBadge from '../ui/AccountTypeBadge';
import { useSession as useAuth } from '../../core/session';
import { useLanguage } from '../../i18n';

/**
 * 64px-wide module rail. Uses logical CSS properties so it mirrors correctly
 * when the document language switches to Persian/RTL.
 */
export default function ModuleRail({
  currentModule,
  basePath,
  modules,
  notifCount = 0,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, tr } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <aside
      aria-label={t('common.moduleSwitcher', 'Module switcher')}
      className={cn(
        'ds-module-rail',
        '[position:fixed]',
        '[top:0]',
        '[bottom:0]',
        '[inset-inline-start:0]',
        '[width:var(--module-rail-width)]',
        '[z-index:100]',
        '[background:var(--surface-card)]',
        '[border-inline-end:1px_solid_var(--border-subtle)]',
        '[display:flex]',
        '[flex-direction:column]',
        '[align-items:center]',
        '[padding:14px_0]',
        '[gap:6px]',
      )}
    >
      <button
        type="button"
        onClick={() => navigate(`${basePath}/${currentModule || 'analytics'}`)}
        aria-label="Ravinta home"
        className={cn(
          '[width:36px]',
          '[height:36px]',
          '[border-radius:var(--radius-md)]',
          '[border:none]',
          '[padding:0]',
          '[background:var(--brand-gradient)]',
          '[box-shadow:var(--shadow-sm)]',
          '[cursor:pointer]',
          '[display:flex]',
          '[align-items:center]',
          '[justify-content:center]',
        )}
      >
        <BrandMark size={22} />
      </button>

      <Divider />

      <div
        className={cn(
          '[display:flex]',
          '[flex-direction:column]',
          '[gap:4px]',
          '[align-items:center]',
          '[margin-top:4px]',
        )}
      >
        {modules.map((m) => (
          <ModuleButton
            key={m.id}
            module={m}
            active={currentModule === m.id}
            soonLabel={t('common.soon', 'Soon')}
            onClick={() => {
              if (!m.enabled || m.comingSoon) return;
              navigate(`${basePath}/${m.id}`);
            }}
          />
        ))}
      </div>

      <div
        className={cn(
          '[margin-top:auto]',
          '[display:flex]',
          '[flex-direction:column]',
          '[align-items:center]',
          '[gap:4px]',
        )}
      >
        <RailIconBtn
          icon={Bell}
          label={t('common.notifications', 'Notifications')}
          onClick={() => navigate(`${basePath}/analytics/alerts`)}
          dot={notifCount > 0}
        />

        <RailIconBtn
          icon={Settings}
          label={t('common.settings', 'Settings')}
          onClick={() => navigate(`${basePath}/account-settings`)}
        />

        <UserMenu
          user={user}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          tr={tr}
          accountMenuLabel={t('common.accountMenu', 'Account menu')}
          onLogout={() => {
            logout();
            navigate('/login');
          }}
        />
      </div>
    </aside>
  );
}
function ModuleButton({ module: m, active, onClick, soonLabel }) {
  const Icon = m.icon;
  const disabled = !m.enabled || m.comingSoon;
  const tooltip = m.comingSoon ? `${m.label} — ${soonLabel}` : m.label;
  return (
    <div
      data-tip={tooltip}
      className={cn('ds-rail-tip', '[position:relative]')}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
        aria-current={active ? 'page' : undefined}
        className={cn(
          cn(
            '[width:40px]',
            '[height:40px]',
            '[border:none]',
            '[padding:0]',
            '[border-radius:var(--radius-md)]',
            disabled ? '[cursor:not-allowed]' : '[cursor:pointer]',
            disabled ? '[opacity:0.45]' : '[opacity:1]',
            active
              ? '[background:var(--brand-gradient)]'
              : '[background:transparent]',
            active
              ? '[color:var(--text-on-brand)]'
              : '[color:var(--text-tertiary)]',
            active
              ? '[box-shadow:0_4px_14px_var(--brand-primary-glow)]'
              : '[box-shadow:none]',
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:center]',
            '[transition:var(--transition-fast)]',
            '[position:relative]',
          ),
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Icon size={18} strokeWidth={2} />

        {m.comingSoon && (
          <span
            className={cn(
              '[position:absolute]',
              '[top:-2px]',
              '[inset-inline-end:-2px]',
              '[background:var(--warning)]',
              '[color:var(--text-on-brand)]',
              '[font-size:8px]',
              '[font-weight:700]',
              '[padding:1px_4px]',
              '[border-radius:999px]',
              '[line-height:1]',
            )}
          >
            {soonLabel}
          </span>
        )}

        {!!m.badge && m.badge > 0 && (
          <span
            className={cn(
              '[position:absolute]',
              '[top:4px]',
              '[inset-inline-end:4px]',
              '[min-width:16px]',
              '[height:16px]',
              '[padding:0_4px]',
              '[background:var(--brand-primary-hover)]',
              '[color:var(--text-on-brand)]',
              '[font-size:9px]',
              '[font-weight:700]',
              '[line-height:16px]',
              '[border-radius:999px]',
              '[text-align:center]',
            )}
          >
            {m.badge > 99 ? '99+' : m.badge}
          </span>
        )}
      </button>
    </div>
  );
}
function RailIconBtn({ icon: Icon, label, onClick, dot }) {
  return (
    <div data-tip={label} className={cn('ds-rail-tip', '[position:relative]')}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          cn(
            '[width:36px]',
            '[height:36px]',
            '[padding:0]',
            '[border:none]',
            '[border-radius:var(--radius-md)]',
            '[background:transparent]',
            '[color:var(--text-tertiary)]',
            '[cursor:pointer]',
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:center]',
            '[transition:var(--transition-fast)]',
            '[position:relative]',
          ),
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Icon size={16} strokeWidth={2} />
        {dot && (
          <span
            aria-hidden
            className={cn(
              '[position:absolute]',
              '[top:8px]',
              '[inset-inline-end:8px]',
              '[width:6px]',
              '[height:6px]',
              '[background:var(--danger)]',
              '[border-radius:50%]',
            )}
          />
        )}
      </button>
    </div>
  );
}
function UserMenu({
  user,
  open,
  onOpenChange,
  onLogout,
  tr,
  accountMenuLabel,
}) {
  const navigate = useNavigate();
  const isAgency = user?.account_type === 'agency_member';
  const isEndUser = user?.account_type === 'end_user';
  const initial = (
    (user?.name || user?.email || 'U').trim()[0] || 'U'
  ).toUpperCase();
  const hue = hashHue(user?.email || user?.name || '');
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={accountMenuLabel}
          className={cn(
            '[width:36px]',
            '[height:36px]',
            '[padding:0]',
            '[border-radius:999px]',
            '[border:1px_solid_var(--border-subtle)]',
            '[background:var(--brand-gradient)]',
            '[color:var(--text-on-brand)]',
            '[font-weight:700]',
            '[font-size:13px]',
            '[cursor:pointer]',
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:center]',
            '[transition:var(--transition-fast)]',
          )}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="start">
        <div
          className={cn(
            '[padding:8px_10px_10px]',
            '[border-bottom:1px_solid_var(--border-subtle)]',
          )}
        >
          <div
            className={cn(
              '[font-size:13px]',
              '[font-weight:600]',
              '[color:var(--text-primary)]',
            )}
          >
            {user?.name || user?.email}
          </div>
          <div className={cn('[margin-top:6px]')}>
            <AccountTypeBadge
              type={user?.account_type}
              role={user?.role}
              size="sm"
            />
          </div>
        </div>
        {isAgency && (
          <>
            <MenuRow
              icon={Briefcase}
              label={tr('Manage agency')}
              onClick={() => {
                onOpenChange(false);
                navigate('/agency');
              }}
            />
            <MenuRow
              icon={Store}
              label={tr('Marketplace profile')}
              onClick={() => {
                onOpenChange(false);
                navigate('/agency/marketplace-profile');
              }}
            />
          </>
        )}
        {isEndUser && (
          <MenuRow
            icon={Briefcase}
            label={tr('My agency')}
            onClick={() => {
              onOpenChange(false);
              navigate('/u/agency');
            }}
          />
        )}
        <MenuRow
          icon={Settings}
          label={tr('Account settings')}
          onClick={() => {
            onOpenChange(false);
            navigate(
              user?.role === 'client'
                ? '/dashboard/account-settings'
                : '/admin/account-settings',
            );
          }}
        />
        <MenuRow
          icon={LogOut}
          label={tr('Sign out')}
          danger
          onClick={onLogout}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function MenuRow({ icon: Icon, label, onClick, danger }) {
  return (
    <DropdownMenuItem
      type="button"
      onSelect={onClick}
      className={cn(
        cn(
          '[display:flex]',
          '[align-items:center]',
          '[gap:10px]',
          '[width:100%]',
          '[padding:8px_10px]',
          '[background:transparent]',
          '[border:none]',
          '[border-radius:var(--radius-sm)]',
          danger ? '[color:var(--danger)]' : '[color:var(--text-primary)]',
          '[font-size:13px]',
          '[font-weight:500]',
          '[cursor:pointer]',
          '[text-align:start]',
          '[transition:var(--transition-fast)]',
        ),
        'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </DropdownMenuItem>
  );
}
function Divider() {
  return (
    <div
      className={cn(
        '[width:32px]',
        '[height:1px]',
        '[background:var(--border-subtle)]',
        '[margin:8px_0]',
      )}
    />
  );
}
function hashHue(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++)
    h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}
