import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from './useAuth';

/**
 * Hides an action the role cannot perform. The API still returns 403 if the
 * request is crafted by hand.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = useAuth();
  const { t } = useTranslation();

  if (!can(permission)) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-6 text-center">
        <div className="grid max-w-md justify-items-center gap-4">
          <p className="eyebrow">{t('errors.forbidden')}</p>
          <h1 className="text-3xl">{t('errors.forbiddenBody')}</h1>
          <Link to="/" className="btn btn-secondary btn-sm">
            {t('errors.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
