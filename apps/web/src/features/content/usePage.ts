import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';

import { fetchPage } from './api';

/**
 * A draft answers 404, exactly like a missing page: the storefront shows the
 * same "page en préparation" state and never reveals unpublished content.
 */
export function usePage(slug: string) {
  return useQuery({
    queryKey: ['content', 'page', slug],
    queryFn: () => fetchPage(slug),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });
}
