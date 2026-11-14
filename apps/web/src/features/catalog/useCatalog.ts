import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';

import { fetchProduct, fetchProducts, fetchRelatedProducts } from './api';
import type { ProductQuery } from './types';

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: ['catalog', 'products', query],
    queryFn: () => fetchProducts(query),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'product', slug],
    queryFn: () => fetchProduct(slug as string),
    enabled: Boolean(slug),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });
}

export function useRelatedProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'related', slug],
    queryFn: () => fetchRelatedProducts(slug as string),
    enabled: Boolean(slug),
  });
}
