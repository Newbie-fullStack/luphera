import { apiRequestWithMeta } from '@/lib/api/client';

import type {
  Bundle,
  CatalogMeta,
  ProductDetail,
  ProductPage,
  ProductQuery,
  ProductSummary,
} from './types';

function toSearchParams(query: ProductQuery): string {
  const params = new URLSearchParams();

  if (query.line) params.set('line', query.line);
  if (query.family) params.set('family', query.family);
  query.notes?.forEach((note) => params.append('notes[]', note));
  if (query.min_price !== undefined) params.set('min_price', String(query.min_price));
  if (query.max_price !== undefined) params.set('max_price', String(query.max_price));
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (query.per_page) params.set('per_page', String(query.per_page));
  if (query.cursor) params.set('cursor', query.cursor);

  const search = params.toString();

  return search === '' ? '' : `?${search}`;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<ProductPage> {
  const { data, meta } = await apiRequestWithMeta<ProductSummary[]>(
    `/products${toSearchParams(query)}`,
  );

  return { items: data, meta: meta as unknown as CatalogMeta };
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  return apiRequestWithMeta<ProductDetail>(`/products/${encodeURIComponent(slug)}`).then(
    (payload) => payload.data,
  );
}

export async function fetchRelatedProducts(slug: string): Promise<ProductSummary[]> {
  return apiRequestWithMeta<ProductSummary[]>(
    `/products/${encodeURIComponent(slug)}/related`,
  ).then((payload) => payload.data);
}

export async function fetchBundles(): Promise<Bundle[]> {
  return apiRequestWithMeta<Bundle[]>('/bundles').then((payload) => payload.data);
}
