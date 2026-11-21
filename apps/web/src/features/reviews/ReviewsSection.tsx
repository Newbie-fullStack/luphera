import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { FieldShell, TextField } from '@/components/ui/Field';
import { FormAlert, FormNotice } from '@/features/auth/components/AuthShell';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/format';

import { submitReview } from './api';
import { createReviewSchema, type ReviewFormValues } from './schema';
import type { ReviewDistribution, ReviewSummary } from './types';
import { useReviews } from './useReviews';

const RATINGS = [5, 4, 3, 2, 1] as const;

interface ReviewsSectionProps {
  productId: string;
  slug: string;
}

export function ReviewsSection({ productId, slug }: ReviewsSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reviews = useReviews(slug);
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(() => createReviewSchema(t), [t]);
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: '', title: '', body: '' },
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);

    try {
      await submitReview({
        product_id: productId,
        rating: Number(values.rating),
        title: values.title === '' ? null : (values.title ?? null),
        body: values.body,
      });
      setSubmitted(true);
      form.reset({ rating: '', title: '', body: '' });
      void queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'review_not_eligible') {
          setServerError(t('reviews.notEligible'));
        } else if (error.code === 'already_reviewed') {
          setServerError(t('reviews.alreadyReviewed'));
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError(t('reviews.error'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  const summary: ReviewSummary = reviews.data ?? {
    reviews: [],
    average: null,
    count: 0,
    distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  };

  return (
    <section className="mt-20 border-t border-ligne pt-12" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-3">
          <p className="eyebrow">{t('reviews.eyebrow')}</p>
          <h2 id="reviews-title" className="text-[clamp(1.6rem,3vw,2.2rem)]">
            {t('reviews.title')}
          </h2>
        </div>
        {summary.count > 0 && summary.average !== null ? (
          <div className="flex items-center gap-4">
            <span className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-ivoire">
              {summary.average.toFixed(1)}
            </span>
            <div className="grid gap-1">
              <Stars
                rating={Math.round(summary.average)}
                label={t('reviews.average', { rating: summary.average.toFixed(1) })}
              />
              <span className="text-[11px] uppercase tracking-[.24em] text-brume">
                {t('reviews.count', { count: summary.count })}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {reviews.isPending ? (
        <p role="status" className="mt-8 text-[11px] uppercase tracking-[.3em] text-brume">
          {t('content.loading')}
        </p>
      ) : null}

      {summary.count > 0 ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
          <Distribution distribution={summary.distribution} count={summary.count} />

          <ul className="grid gap-6">
            {summary.reviews.map((review) => {
              const date = formatDate(review.created_at);

              return (
                <li key={review.id} className="border-b border-ligne pb-6 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars rating={review.rating} label={t('reviews.starsLabel', { rating: review.rating })} />
                    <span className="text-[10px] uppercase tracking-[.24em] text-or-clair">
                      {t('reviews.verified')}
                    </span>
                    {date !== null ? (
                      <span className="text-[11px] tracking-wide text-brume">{date}</span>
                    ) : null}
                  </div>
                  {review.title !== null && review.title !== '' ? (
                    <h3 className="mt-3 font-display text-lg text-ivoire">{review.title}</h3>
                  ) : null}
                  <p className="mt-2 text-[15px] leading-relaxed text-texte">{review.body}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[.24em] text-brume">
                    {review.author}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!reviews.isPending && summary.count === 0 ? (
        <p className="mt-8 text-[15px] text-brume">{t('reviews.empty')}</p>
      ) : null}

      <div className="mt-12 max-w-[640px] border border-ligne bg-obsidienne p-6 sm:p-8">
        <h3 className="font-display text-xl text-ivoire">{t('reviews.formTitle')}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-brume">{t('reviews.formLead')}</p>

        {user === null ? (
          <p className="mt-5 text-[14px] text-texte">
            {t('reviews.loginPrompt')}{' '}
            <Link
              to={`/connexion?redirect=${encodeURIComponent(`/produit/${slug}`)}`}
              className="lnk"
            >
              {t('reviews.login')}
            </Link>
          </p>
        ) : submitted ? (
          <div className="mt-5">
            <FormNotice message={t('reviews.pending')} />
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => void submit(event)}
            className="mt-5 grid gap-5"
          >
            <FieldShell
              id="review-rating"
              label={t('reviews.rating')}
              hint={t('reviews.ratingHint')}
              error={form.formState.errors.rating?.message}
            >
              <div className="flex gap-2">
                {RATINGS.map((value) => (
                  <label key={value} className="cursor-pointer text-brume hover:text-or-clair">
                    <input
                      type="radio"
                      value={value}
                      className="peer sr-only"
                      aria-label={t('reviews.starsLabel', { rating: value })}
                      {...form.register('rating')}
                    />
                    <Star
                      size={22}
                      aria-hidden="true"
                      className="transition-colors peer-checked:text-or peer-focus-visible:text-or-clair"
                    />
                  </label>
                ))}
              </div>
            </FieldShell>

            <TextField
              id="review-title"
              label={t('reviews.reviewTitle')}
              hint={t('reviews.reviewTitleOptional')}
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />

            <FieldShell
              id="review-body"
              label={t('reviews.body')}
              hint={t('reviews.bodyHint')}
              error={form.formState.errors.body?.message}
            >
              <textarea
                id="review-body"
                rows={5}
                className="field-input py-3"
                aria-invalid={form.formState.errors.body ? true : undefined}
                aria-describedby={form.formState.errors.body ? 'review-body-error' : 'review-body-hint'}
                {...form.register('body')}
              />
            </FieldShell>

            <FormAlert message={serverError} />

            <Button type="submit" disabled={submitting}>
              {submitting ? t('reviews.submitting') : t('reviews.submit')}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex gap-0.5 text-or">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={14}
          aria-hidden="true"
          fill={value <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

function Distribution({
  distribution,
  count,
}: {
  distribution: ReviewDistribution;
  count: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid content-start gap-2">
      {RATINGS.map((rating) => {
        const value = distribution[String(rating) as keyof ReviewDistribution];
        const percent = count === 0 ? 0 : Math.round((value / count) * 100);

        return (
          <div key={rating} className="flex items-center gap-3 text-[12px] text-brume">
            <span className="w-3 tabular-nums">{rating}</span>
            <span className="h-1 flex-1 bg-ligne" aria-hidden="true">
              <span className="block h-full bg-or" style={{ width: `${percent}%` }} />
            </span>
            <span className="w-8 text-right tabular-nums">{t('reviews.count', { count: value })}</span>
          </div>
        );
      })}
    </div>
  );
}
