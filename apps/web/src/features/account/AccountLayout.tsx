import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/cn';

const sections = [
  { to: '/compte', key: 'account.nav.profile', end: true },
  { to: '/compte/commandes', key: 'account.nav.orders' },
  { to: '/compte/adresses', key: 'account.nav.addresses' },
  { to: '/compte/favoris', key: 'account.nav.wishlist' },
] as const;

export function AccountLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
      void navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="gutter pb-24 pt-10">
      <Breadcrumbs
        items={[{ label: t('product.breadcrumbHome'), to: '/' }, { label: t('nav.account') }]}
      />

      <div className="mt-8">
        <PageHeader
          eyebrow={t('account.eyebrow')}
          title={t('account.title', { name: user?.name ?? '' })}
          lead={t('account.lead')}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-16">
        <aside className="grid gap-6">
          <nav aria-label={t('account.nav.label')} className="grid border-t border-ligne">
            {sections.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                end={'end' in section ? section.end : false}
                className={({ isActive }) =>
                  cn(
                    'border-b border-ligne py-3.5 text-[11.5px] font-medium uppercase tracking-[.24em] text-brume transition-colors hover:text-ivoire',
                    isActive && 'text-or-clair',
                  )
                }
              >
                {t(section.key)}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="justify-self-start text-[11px] uppercase tracking-[.24em] text-brume transition-colors hover:text-or-clair disabled:opacity-50"
          >
            {loggingOut ? t('account.loggingOut') : t('account.logout')}
          </button>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
