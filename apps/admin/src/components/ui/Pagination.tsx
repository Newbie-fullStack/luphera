import { useTranslation } from 'react-i18next';

import type { PaginationMeta } from '@/lib/api/types';

export function Pagination({
  meta,
  onChange,
}: {
  meta: PaginationMeta;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  if (meta.last_page <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs text-brume">
        {t('common.page')} {meta.current_page} {t('common.of')} {meta.last_page} ·{' '}
        {t('common.results', { count: meta.total })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={meta.current_page <= 1}
          onClick={() => {
            onChange(meta.current_page - 1);
          }}
        >
          {t('common.previous')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => {
            onChange(meta.current_page + 1);
          }}
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
