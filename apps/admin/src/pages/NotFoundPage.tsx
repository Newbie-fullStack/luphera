import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="grid max-w-md justify-items-center gap-4">
        <p className="eyebrow">404</p>
        <h1 className="text-3xl">{t('errors.notFound')}</h1>
        <p className="text-sm text-brume">{t('errors.notFoundBody')}</p>
        <Link to="/" className="btn btn-secondary btn-sm">
          {t('errors.backHome')}
        </Link>
      </div>
    </div>
  );
}
