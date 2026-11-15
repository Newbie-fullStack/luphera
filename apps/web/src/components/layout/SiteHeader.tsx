import { useState } from 'react';
import { Menu, ShoppingBag } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Drawer } from '@/components/ui/Drawer';
import { useCart } from '@/features/cart/useCart';
import { cn } from '@/lib/cn';

const links = [
  { to: '/', key: 'nav.maison', end: true },
  { to: '/boutique', key: 'nav.shop' },
  { to: '/histoire', key: 'nav.story' },
  { to: '/design-system', key: 'nav.designSystem' },
] as const;

export function SiteHeader() {
  const { t } = useTranslation();
  const { count, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-nuit via-nuit/90 to-transparent pb-6 pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <div className="gutter flex items-center justify-between gap-6">
          <Link
            to="/"
            aria-label={t('brand.home')}
            className="font-display text-[19px] leading-none tracking-[.34em] text-ivoire pl-[.34em]"
          >
            LUPHÉRA
          </Link>

          <nav aria-label={t('nav.label')} className="hidden items-center gap-8 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? link.end : false}
                className={({ isActive }) =>
                  cn(
                    'relative py-2 text-[11.5px] font-medium uppercase tracking-[.24em] text-brume transition-colors duration-300 hover:text-ivoire',
                    'after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-or after:transition-transform after:duration-500 after:ease-lux hover:after:scale-x-100',
                    isActive && 'text-ivoire after:scale-x-100',
                  )
                }
              >
                {t(link.key)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCart}
              aria-label={t('nav.openCart')}
              className="inline-flex min-h-10 items-center gap-2.5 border border-ligne-forte bg-nuit/50 px-4 text-[11.5px] font-medium uppercase tracking-[.24em] text-ivoire transition-colors duration-300 hover:border-or hover:bg-or/10"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{t('nav.cart')}</span>
              <b className="inline-grid h-5 min-w-5 place-items-center bg-or px-1 text-[11px] font-medium tracking-normal text-nuit">
                {count}
              </b>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              className="grid size-10 place-items-center border border-ligne-forte text-ivoire transition-colors hover:border-or lg:hidden"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('brand.name')}
        closeLabel={t('nav.closeMenu')}
        side="left"
      >
        <nav aria-label={t('nav.label')} className="grid">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : false}
              onClick={() => setMenuOpen(false)}
              className="border-b border-ligne py-4 text-[12px] font-medium uppercase tracking-[.26em] text-brume transition-colors hover:text-or-clair"
            >
              {t(link.key)}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
