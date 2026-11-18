import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SiteLayout } from '@/components/layout/SiteLayout';
import { RequireAuth } from '@/features/account/RequireAuth';
import { HomePage } from '@/pages/HomePage';

const ShopPage = lazy(() =>
  import('@/pages/ShopPage').then((module) => ({ default: module.ShopPage })),
);
const ProductPage = lazy(() =>
  import('@/pages/ProductPage').then((module) => ({ default: module.ProductPage })),
);
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
);
const ConfirmationPage = lazy(() =>
  import('@/pages/ConfirmationPage').then((module) => ({ default: module.ConfirmationPage })),
);
const TrackingPage = lazy(() =>
  import('@/pages/TrackingPage').then((module) => ({ default: module.TrackingPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
);
const AccountLayout = lazy(() =>
  import('@/features/account/AccountLayout').then((module) => ({ default: module.AccountLayout })),
);
const AccountProfilePage = lazy(() =>
  import('@/features/account/AccountProfilePage').then((module) => ({
    default: module.AccountProfilePage,
  })),
);
const AccountOrdersPage = lazy(() =>
  import('@/features/account/AccountOrdersPage').then((module) => ({
    default: module.AccountOrdersPage,
  })),
);
const AccountOrderPage = lazy(() =>
  import('@/features/account/AccountOrderPage').then((module) => ({
    default: module.AccountOrderPage,
  })),
);
const AccountAddressesPage = lazy(() =>
  import('@/features/account/AccountAddressesPage').then((module) => ({
    default: module.AccountAddressesPage,
  })),
);
const AccountWishlistPage = lazy(() =>
  import('@/features/account/AccountWishlistPage').then((module) => ({
    default: module.AccountWishlistPage,
  })),
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
          <Route path="produit/:slug" element={<ProductPage />} />
          <Route path="commande" element={<CheckoutPage />} />
          <Route path="commande/confirmation/:number" element={<ConfirmationPage />} />
          <Route path="suivi" element={<TrackingPage />} />
          <Route path="connexion" element={<LoginPage />} />
          <Route path="inscription" element={<RegisterPage />} />
          <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route path="reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
          <Route
            path="compte"
            element={
              <RequireAuth>
                <AccountLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AccountProfilePage />} />
            <Route path="commandes" element={<AccountOrdersPage />} />
            <Route path="commandes/:number" element={<AccountOrderPage />} />
            <Route path="adresses" element={<AccountAddressesPage />} />
            <Route path="favoris" element={<AccountWishlistPage />} />
          </Route>
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
