import { useQuery } from '@tanstack/react-query';

import { fetchSettings } from './api';

/**
 * Shop settings are edited in the back-office; the storefront only reads them.
 * Cached for five minutes: an announcement change is not time-critical.
 */
export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: fetchSettings,
    staleTime: 300_000,
  });
}
