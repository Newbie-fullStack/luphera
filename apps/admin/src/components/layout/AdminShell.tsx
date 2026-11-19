import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  TicketPercent,
  Users,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';

import { useAuth } from '@/features/auth/useAuth';

interface NavItem {
  to: string;
  labelKey: string;
  permission: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groupPilotage',
    items: [
      {
        to: '/',
        labelKey: 'nav.dashboard',
        permission: 'orders.view',
        icon: LayoutDashboard,
        end: true,
      },
      { to: '/commandes', labelKey: 'nav.orders', permission: 'orders.view', icon: ShoppingBag },
    ],
  },
  {
    labelKey: 'nav.groupCatalogue',
    items: [
      { to: '/produits', labelKey: 'nav.products', permission: 'catalog.view', icon: Package },
      { to: '/stock', labelKey: 'nav.stock', permission: 'catalog.view', icon: Boxes },
    ],
  },
  {
    labelKey: 'nav.groupRelation',
    items: [
      { to: '/clients', labelKey: 'nav.customers', permission: 'customers.view', icon: Users },
      { to: '/coupons', labelKey: 'nav.coupons', permission: 'marketing.manage', icon: TicketPercent },
      { to: '/pages', labelKey: 'nav.pages', permission: 'content.manage', icon: FileText },
    ],
  },
  {
    labelKey: 'nav.groupSystem',
    items: [
      { to: '/parametres', labelKey: 'nav.settings', permission: 'settings.manage', icon: Settings },
      { to: '/journal', labelKey: 'nav.audit', permission: 'audit.view', icon: ScrollText },
    ],
  },
];

export function AdminShell() {
  const { t } = useTranslation();
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);

  const role = user?.roles[0] ?? '';

  const onLogout = async (): Promise<void> => {
    await logout();
    void navigate('/connexion', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-nuit">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-w)] flex-col border-r border-ligne bg-obsidienne transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label={t('brand.console')}
      >
        <div className="flex h-[var(--header-h)] items-center justify-between border-b border-ligne px-5">
          <div>
            <p className="font-display text-lg tracking-[0.18em] text-ivoire">LUPHÉRA</p>
            <p className="text-[9px] tracking-[0.26em] text-or">{t('brand.console')}</p>
          </div>
          <button
            type="button"
            className="text-brume hover:text-ivoire lg:hidden"
            onClick={() => {
              setOpen(false);
            }}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {groups.map((group) => (
            <div key={group.labelKey} className="mb-5">
              <p className="px-3 pb-2 text-[9px] tracking-[0.22em] text-brume/70 uppercase">
                {t(group.labelKey)}
              </p>
              <div className="grid gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end ?? false}
                      className={({ isActive }) => cn('nav-link', isActive && 'active')}
                      onClick={() => {
                        setOpen(false);
                      }}
                    >
                      <Icon aria-hidden="true" />
                      {t(item.labelKey)}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-ligne p-4">
          <p className="truncate text-sm text-ivoire">{user?.name}</p>
          <p className="text-[10px] tracking-[0.18em] text-brume uppercase">
            {role === '' ? '' : t(`roles.${role}`, { defaultValue: role })}
          </p>
          <button
            type="button"
            className="mt-3 flex items-center gap-2 text-xs text-brume transition-colors hover:text-err"
            onClick={() => void onLogout()}
          >
            <LogOut size={14} aria-hidden="true" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-nuit/70 backdrop-blur-sm lg:hidden"
          aria-label={t('common.close')}
          onClick={() => {
            setOpen(false);
          }}
        />
      ) : null}

      <div className="lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-20 flex h-[var(--header-h)] items-center justify-between border-b border-ligne bg-nuit/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="text-brume hover:text-ivoire lg:hidden"
            onClick={() => {
              setOpen(true);
            }}
            aria-label={t('nav.dashboard')}
          >
            <Menu size={20} />
          </button>
          <p className="font-display text-sm tracking-[0.18em] text-ivoire sm:hidden">LUPHÉRA</p>
          <p className="hidden text-xs tracking-[0.2em] text-brume uppercase sm:block">
            {t('brand.console')}
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-brume sm:inline">{user?.email ?? user?.phone}</span>
            <span className="grid size-8 place-items-center border border-ligne-forte font-display text-sm text-or">
              {user?.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] min-w-0 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
