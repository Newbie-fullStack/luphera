import { useTranslation } from 'react-i18next';

import { usePublicSettings } from '@/features/settings/usePublicSettings';

/**
 * Shop-wide announcement driven by the `shop.announcement*` settings.
 * Rendered only when the back-office has activated a non-empty message.
 */
export function AnnouncementBar() {
  const { t } = useTranslation();
  const { data } = usePublicSettings();

  if (data === undefined || !data.announcement.active || data.announcement.text.trim() === '') {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={t('announcement.label')}
      className="border-b border-or/30 bg-obsidienne"
    >
      <p className="gutter py-2.5 text-center text-[10.5px] uppercase leading-relaxed tracking-[.26em] text-or-clair">
        {data.announcement.text}
      </p>
    </div>
  );
}
