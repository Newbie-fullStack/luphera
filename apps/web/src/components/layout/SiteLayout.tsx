import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { CartDrawer } from '@/features/cart/components/CartDrawer';

import { AnnouncementBar } from './AnnouncementBar';
import { ScrollProgress } from './ScrollProgress';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export function SiteLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-nuit">
      <a
        href="#contenu"
        className="fixed left-4 top-4 z-[70] -translate-y-24 bg-or px-5 py-3 text-[11px] font-medium uppercase tracking-[.24em] text-nuit transition-transform focus:translate-y-0"
      >
        {t('common.skipToContent')}
      </a>
      <ScrollToTop />
      <ScrollProgress />
      <SiteHeader />
      <CartDrawer />
      <main id="contenu" tabIndex={-1} className="flex-1 pt-[104px] outline-none">
        <AnnouncementBar />
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
