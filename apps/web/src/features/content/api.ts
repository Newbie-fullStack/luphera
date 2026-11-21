import { apiRequest } from '@/lib/api/client';

import type { CmsPage, CmsPageSummary } from './types';

export function fetchPage(slug: string): Promise<CmsPage> {
  return apiRequest<CmsPage>(`/pages/${encodeURIComponent(slug)}`);
}

export function fetchPages(): Promise<CmsPageSummary[]> {
  return apiRequest<CmsPageSummary[]>('/pages');
}
