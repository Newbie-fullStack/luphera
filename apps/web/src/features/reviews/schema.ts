import type { TFunction } from 'i18next';
import { z } from 'zod';

export function createReviewSchema(t: TFunction) {
  return z.object({
    rating: z
      .string()
      .min(1, t('reviews.errors.rating'))
      .refine((value) => ['1', '2', '3', '4', '5'].includes(value), t('reviews.errors.rating')),
    title: z.string().trim().max(120).optional(),
    body: z
      .string()
      .trim()
      .min(10, t('reviews.errors.body'))
      .max(1000, t('reviews.errors.body')),
  });
}

export type ReviewFormValues = z.infer<ReturnType<typeof createReviewSchema>>;
