import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Check, Search, Star, X } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import { fetchReviews, moderateReview, type ReviewFilters } from '@/lib/api/admin';
import type { ReviewRow, ReviewStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected'];

export function ReviewsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const status = params.get('status') as ReviewStatus | null;
  const page = Number(params.get('page') ?? '1');

  const reviews = useQuery({
    queryKey: ['reviews', q, status, page],
    queryFn: () =>
      fetchReviews({
        q,
        status: status ?? undefined,
        page,
      } satisfies ReviewFilters),
  });

  const moderate = useMutation({
    mutationFn: (target: Exclude<ReviewStatus, 'pending'>) =>
      moderateReview(selected?.id as number, {
        status: target,
        moderation_note: note.trim() === '' ? null : note.trim(),
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setSelected(updated);
      setNote(updated.moderation_note ?? '');
      setFeedback(t('reviews.updated'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const updateParams = (patch: Record<string, string>): void => {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(patch)) {
      if (value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    if (!('page' in patch)) {
      next.delete('page');
    }

    setParams(next, { replace: true });
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupRelation')}
        title={t('reviews.title')}
        subtitle={t('reviews.subtitle')}
        actions={
          reviews.data !== undefined && reviews.data.pendingCount > 0 ? (
            <span className="badge badge-warn">
              {t('reviews.pendingCount', { count: reviews.data.pendingCount })}
            </span>
          ) : undefined
        }
      />

      {feedback !== null ? (
        <p className="text-xs text-brume" role="status">
          {feedback}
        </p>
      ) : null}

      <form
        className="panel flex flex-wrap items-end gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q });
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label className="field-label" htmlFor="review-q">
            {t('common.search')}
          </label>
          <input
            id="review-q"
            className="field-input"
            placeholder={t('reviews.searchPlaceholder')}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="review-status">
            {t('common.status')}
          </label>
          <select
            id="review-status"
            className="field-select"
            value={status ?? ''}
            onChange={(event) => {
              updateParams({ status: event.target.value });
            }}
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`reviews.status.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          <Search size={14} aria-hidden="true" />
          {t('common.filter')}
        </button>
      </form>

      <div className="panel">
        {reviews.isLoading ? (
          <Spinner />
        ) : reviews.isError || reviews.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : reviews.data.data.length === 0 ? (
          <EmptyState title={t('reviews.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('reviews.product')}</th>
                    <th>{t('reviews.author')}</th>
                    <th>{t('reviews.rating')}</th>
                    <th>{t('common.status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {reviews.data.data.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap text-brume">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="text-ivoire">{entry.product?.name ?? '—'}</td>
                      <td>
                        <p className="text-ivoire">{entry.author}</p>
                        <p className="max-w-[240px] truncate text-xs text-brume">{entry.body}</p>
                      </td>
                      <td>
                        <span
                          className="flex items-center gap-1 text-or"
                          aria-label={t('reviews.starsLabel', { rating: entry.rating })}
                        >
                          <Star size={13} aria-hidden="true" fill="currentColor" />
                          <span className="tabular-nums text-xs text-texte">{entry.rating}/5</span>
                        </span>
                      </td>
                      <td>
                        <StatusBadge value={entry.status} kind="review" />
                      </td>
                      <td className="actions">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setSelected(entry);
                              setNote(entry.moderation_note ?? '');
                              setFeedback(null);
                            }}
                          >
                            {can('reviews.moderate') ? t('reviews.moderate') : t('common.close')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={reviews.data.meta} onChange={(next) => updateParams({ page: String(next) })} />
          </>
        )}
      </div>

      {selected !== null ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">{selected.title ?? selected.author}</h2>
              <p className="mt-1 text-xs text-brume">
                {selected.product?.name ?? '—'} · {selected.author} · {selected.rating}/5
              </p>
            </div>
            <button
              type="button"
              className="text-[10px] tracking-[0.16em] text-brume uppercase hover:text-ivoire"
              onClick={() => {
                setSelected(null);
              }}
            >
              {t('common.close')}
            </button>
          </div>
          <div className="panel-body grid gap-5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-texte">{selected.body}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-brume">
              <StatusBadge value={selected.status} kind="review" />
              {selected.moderator !== null ? (
                <span>{t('reviews.moderatedBy', { name: selected.moderator })}</span>
              ) : null}
              {selected.moderated_at !== null ? (
                <span>{formatDateTime(selected.moderated_at)}</span>
              ) : null}
            </div>

            {can('reviews.moderate') ? (
              <div className="grid gap-4 border-t border-ligne pt-4">
                <div>
                  <label className="field-label" htmlFor="review-note">
                    {t('reviews.note')}
                  </label>
                  <input
                    id="review-note"
                    className="field-input"
                    value={note}
                    placeholder={t('reviews.notePlaceholder')}
                    onChange={(event) => {
                      setNote(event.target.value);
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={moderate.isPending}
                    onClick={() => {
                      moderate.mutate('approved');
                    }}
                  >
                    <Check size={14} aria-hidden="true" />
                    {t('reviews.approve')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={moderate.isPending}
                    onClick={() => {
                      moderate.mutate('rejected');
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                    {t('reviews.reject')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
