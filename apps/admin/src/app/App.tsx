import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '@/components/layout/AdminShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { PagesPage } from '@/pages/PagesPage';
import { ProductEditorPage } from '@/pages/ProductEditorPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StockPage } from '@/pages/StockPage';

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AdminShell />}>
          <Route
            index
            element={
              <RequirePermission permission="orders.view">
                <DashboardPage />
              </RequirePermission>
            }
          />

          <Route
            path="commandes"
            element={
              <RequirePermission permission="orders.view">
                <OrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="commandes/:number"
            element={
              <RequirePermission permission="orders.view">
                <OrderDetailPage />
              </RequirePermission>
            }
          />

          <Route
            path="produits"
            element={
              <RequirePermission permission="catalog.view">
                <ProductsPage />
              </RequirePermission>
            }
          />
          <Route
            path="produits/nouveau"
            element={
              <RequirePermission permission="catalog.manage">
                <ProductEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="produits/:id"
            element={
              <RequirePermission permission="catalog.view">
                <ProductEditorPage />
              </RequirePermission>
            }
          />

          <Route
            path="stock"
            element={
              <RequirePermission permission="catalog.view">
                <StockPage />
              </RequirePermission>
            }
          />

          <Route
            path="clients"
            element={
              <RequirePermission permission="customers.view">
                <CustomersPage />
              </RequirePermission>
            }
          />
          <Route
            path="clients/:id"
            element={
              <RequirePermission permission="customers.view">
                <CustomerDetailPage />
              </RequirePermission>
            }
          />

          <Route
            path="messages"
            element={
              <RequirePermission permission="messages.view">
                <MessagesPage />
              </RequirePermission>
            }
          />

          <Route
            path="avis"
            element={
              <RequirePermission permission="reviews.moderate">
                <ReviewsPage />
              </RequirePermission>
            }
          />

          <Route
            path="coupons"
            element={
              <RequirePermission permission="marketing.manage">
                <CouponsPage />
              </RequirePermission>
            }
          />

          <Route
            path="pages"
            element={
              <RequirePermission permission="content.manage">
                <PagesPage />
              </RequirePermission>
            }
          />

          <Route
            path="parametres"
            element={
              <RequirePermission permission="settings.manage">
                <SettingsPage />
              </RequirePermission>
            }
          />

          <Route
            path="journal"
            element={
              <RequirePermission permission="audit.view">
                <AuditLogPage />
              </RequirePermission>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
