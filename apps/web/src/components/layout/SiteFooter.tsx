import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const columns = [
  {
    titleKey: 'footer.house',
    links: [
      { to: '/histoire', labelKey: 'footer.story' },
      { to: '/design-system', labelKey: 'footer.designSystem' },
    ],
  },
  {
    titleKey: 'footer.help',
    links: [
      { to: '/livraison', labelKey: 'footer.shipping' },
      { to: '/contact', labelKey: 'footer.contact' },
    ],
  },
  {
    titleKey: 'footer.legal',
    links: [
      { to: '/mentions-legales', labelKey: 'footer.terms' },
      { to: '/mentions-legales', labelKey: 'footer.privacy' },
    ],
  },
] as const;

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer aria-label={t('footer.label')} className="border-t border-ligne bg-nuit pb-[calc(56px+env(safe-area-inset-bottom,0px))] pt-14">
      <div className="gutter grid gap-12">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="grid max-w-sm gap-3">
            <p className="font-display text-[19px] tracking-[.34em] text-ivoire">LUPHÉRA</p>
            <p className="text-sm leading-relaxed text-brume">{t('brand.tagline')}</p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-10 sm:grid-cols-3 lg:max-w-xl">
            {columns.map((column) => (
              <div key={column.titleKey} className="grid content-start gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[.28em] text-or">
                  {t(column.titleKey)}
                </p>
                {column.links.map((link) => (
                  <Link
                    key={link.labelKey}
                    to={link.to}
                    className="text-sm text-brume transition-colors hover:text-ivoire"
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ligne pt-6 text-xs text-brume">
          <p>{t('footer.rights', { year })}</p>
          <p>{t('footer.seedNotice')}</p>
        </div>
      </div>
    </footer>
  );
}
