import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('common.breadcrumb')}>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] uppercase tracking-[.24em] text-brume">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-3">
              {item.to && !current ? (
                <Link to={item.to} className="transition-colors hover:text-or-clair">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current ? 'page' : undefined} className={current ? 'text-ivoire' : undefined}>
                  {item.label}
                </span>
              )}
              {current ? null : (
                <span aria-hidden="true" className="text-ligne-forte">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
