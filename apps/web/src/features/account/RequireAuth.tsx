import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';

/**
 * Account routes are private. A visitor is sent to the login screen with the
 * original path, so the session resumes where it was interrupted.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="gutter grid min-h-[45vh] place-items-center py-24">
        <p role="status" className="eyebrow">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (user === null) {
    const redirect = `${location.pathname}${location.search}`;

    return <Navigate to={`/connexion?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
}
