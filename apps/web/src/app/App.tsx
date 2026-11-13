import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SiteLayout } from '@/components/layout/SiteLayout';
import { HomePage } from '@/pages/HomePage';

const ShopPage = lazy(() =>
  import('@/pages/ShopPage').then((module) => ({ default: module.ShopPage })),
);
const DesignSystemPage = lazy(() =>
  import('@/pages/DesignSystemPage').then((module) => ({ default: module.DesignSystemPage })),
);
const PlaceholderPage = lazy(() =>
  import('@/pages/PlaceholderPage').then((module) => ({ default: module.PlaceholderPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

function RouteFallback() {
  const { t } = useTranslation();

  return (
    <div className="gutter grid min-h-[50vh] place-items-center py-24">
      <p className="eyebrow" role="status" aria-live="polite">
        {t('common.loading')}
      </p>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="boutique" element={<ShopPage />} />
          <Route path="produit/:slug" element={<PlaceholderPage titleKey="nav.shop" />} />
          <Route path="commande" element={<PlaceholderPage titleKey="nav.checkout" />} />
          <Route
            path="commande/confirmation/:number"
            element={<PlaceholderPage titleKey="nav.checkout" />}
          />
          <Route path="compte" element={<PlaceholderPage titleKey="nav.account" />} />
          <Route path="histoire" element={<PlaceholderPage titleKey="nav.story" />} />
          <Route path="livraison" element={<PlaceholderPage titleKey="nav.shipping" />} />
          <Route path="contact" element={<PlaceholderPage titleKey="nav.contact" />} />
          <Route path="mentions-legales" element={<PlaceholderPage titleKey="footer.terms" />} />
          <Route path="design-system" element={<DesignSystemPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
