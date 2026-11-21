import { apiRequest, apiRequestWithMeta } from '@/lib/api/client';

import type { Review, ReviewDistribution, ReviewPayload, ReviewSummary } from './types';

const EMPTY_DISTRIBUTION: ReviewDistribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };

function toDistribution(value: unknown): ReviewDistribution {
  if (value === null || typeof value !== 'object') {
    return EMPTY_DISTRIBUTION;
  }

  const source = value as Record<string, unknown>;
  const distribution = { ...EMPTY_DISTRIBUTION };

  for (const rating of ['5', '4', '3', '2', '1'] as const) {
    const count = source[rating];
    distribution[rating] = typeof count === 'number' ? count : 0;
  }

  return distribution;
}

/**
 * Only approved reviews come back from this endpoint; the moderation state is
 * never exposed publicly.
 */
export async function fetchReviews(slug: string): Promise<ReviewSummary> {
  const { data, meta } = await apiRequestWithMeta<Review[]>(
    `/products/${encodeURIComponent(slug)}/reviews`,
  );

  return {
    reviews: data,
    average: typeof meta.average === 'number' ? meta.average : null,
    count: typeof meta.count === 'number' ? meta.count : 0,
    distribution: toDistribution(meta.distribution),
  };
}

export function submitReview(payload: ReviewPayload): Promise<Review> {
  return apiRequest<Review>('/me/reviews', { method: 'POST', body: payload });
}
