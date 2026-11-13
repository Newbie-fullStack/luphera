import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="gutter pb-24 pt-10">
      <PageHeader
        eyebrow={t('notFound.eyebrow')}
        title={t('notFound.title')}
        lead={t('notFound.body')}
      />
      <ButtonLink to="/" variant="secondary">
        {t('notFound.back')}
      </ButtonLink>
    </div>
  );
}
