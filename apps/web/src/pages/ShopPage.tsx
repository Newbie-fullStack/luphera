import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tag } from '@/components/ui/Tag';

export function ShopPage() {
  const { t } = useTranslation();

  return (
    <div className="gutter pb-24 pt-10">
      <PageHeader eyebrow={t('shop.eyebrow')} title={t('shop.title')} lead={t('shop.lead')} />

      <div className="grid justify-items-center gap-5 border border-ligne bg-obsidienne px-6 py-20 text-center">
        <Tag>{t('shop.badge')}</Tag>
        <p className="font-display text-[clamp(1.7rem,4vw,2.6rem)] text-ivoire">{t('shop.empty')}</p>
        <p className="max-w-[42ch] text-[15px] text-brume">{t('shop.emptyHint')}</p>
        <ButtonLink to="/" variant="secondary" className="mt-4">
          {t('shop.emptyAction')}
        </ButtonLink>
      </div>
    </div>
  );
}
