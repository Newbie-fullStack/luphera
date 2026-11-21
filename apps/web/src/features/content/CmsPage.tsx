import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePage } from '@/features/content/usePage';
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

interface CmsPageProps {
  slug: string;
  eyebrowKey?: string;
}

/**
 * Editorial page served by the CMS.
 *
 * The body is plain text: paragraphs are split on blank lines and rendered as
 * text nodes, never as HTML. A draft answers 404 and falls back to the same
 * "page en préparation" screen as a missing page.
 */
export function CmsPage({ slug, eyebrowKey = 'nav.story' }: CmsPageProps) {
  const { t } = useTranslation();
  const { data: page, error, isPending, refetch } = usePage(slug);

  useEffect(() => {
    if (page) {
      document.title = `${page.meta.title} — Luphéra`;
    }
  }, [page]);

  if (error instanceof ApiError && error.status === 404) {
    return <PageUnavailable eyebrow={t(eyebrowKey)} />;
  }

  if (error) {
    return (
      <div className="gutter grid min-h-[60vh] place-items-center py-24">
        <div className="grid justify-items-center gap-4 text-center">
          <p className="font-display text-2xl text-ivoire">{t('content.error')}</p>
          <button type="button" className="btn btn-secondary mt-2" onClick={() => void refetch()}>
            {t('content.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (isPending || !page) {
    return (
      <div className="gutter grid min-h-[60vh] place-items-center py-24">
        <p role="status" className="text-[11px] uppercase tracking-[.3em] text-brume">
          {t('content.loading')}
        </p>
      </div>
    );
  }

  const updated = formatDateTime(page.updated_at);

  return (
    <article className="gutter pb-32 pt-10 lg:pb-24">
      <PageHeader eyebrow={t(eyebrowKey)} title={page.title} lead={page.meta.description ?? undefined} />

      <div className="max-w-[68ch] border-t border-ligne pt-10">
        {page.body.split(/\n{2,}/).map((paragraph, index) => (
          <p
            key={index}
            className="mb-6 whitespace-pre-line text-[16.5px] leading-relaxed text-texte"
          >
            {paragraph.trim()}
          </p>
        ))}
      </div>

      {updated !== null ? (
        <p className="mt-10 text-[11px] uppercase tracking-[.24em] text-brume">
          {t('content.updated', { date: updated })}
        </p>
      ) : null}
    </article>
  );
}

function PageUnavailable({ eyebrow }: { eyebrow: string }) {
  const { t } = useTranslation();

  return (
    <div className="gutter pb-32 pt-10 lg:pb-24">
      <PageHeader
        eyebrow={eyebrow}
        title={t('content.unavailableTitle')}
        lead={t('content.unavailableBody')}
      />
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/contact">{t('content.unavailableContact')}</ButtonLink>
        <ButtonLink to="/boutique" variant="secondary">
          {t('content.back')}
        </ButtonLink>
      </div>
    </div>
  );
}
