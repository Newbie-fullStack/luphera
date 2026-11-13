import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

interface PlaceholderPageProps {
  titleKey: string;
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="gutter pb-24 pt-10">
      <PageHeader
        eyebrow={t('placeholder.eyebrow')}
        title={t(titleKey)}
        lead={t('placeholder.body')}
      />
      <ButtonLink to="/" variant="secondary">
        {t('placeholder.back')}
      </ButtonLink>
    </div>
  );
}
