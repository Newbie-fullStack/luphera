import { useTranslation } from 'react-i18next';

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-live="polite">
      <div className="grid justify-items-center gap-4">
        <span
          className="block size-8 animate-spin rounded-full border border-ligne-forte border-t-or"
          aria-hidden="true"
        />
        <p className="eyebrow">{label ?? t('common.loading')}</p>
      </div>
    </div>
  );
}
