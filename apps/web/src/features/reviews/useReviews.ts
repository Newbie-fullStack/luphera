import { useQuery } from '@tanstack/react-query';

import { fetchReviews } from './api';

export function useReviews(slug: string | undefined) {
  return useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => fetchReviews(slug as string),
    enabled: typeof slug === 'string' && slug !== '',
    staleTime: 60_000,
  });
}
