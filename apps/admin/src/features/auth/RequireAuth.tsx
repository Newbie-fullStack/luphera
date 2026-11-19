import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';

import { useAuth } from './useAuth';

/**
 * Guards every console route. The staff payload is fetched once; while it
 * loads the page shows a calm spinner instead of a flash of the login form.
 */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner label="Vérification de la session…" />;
  }

  if (user === null) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
