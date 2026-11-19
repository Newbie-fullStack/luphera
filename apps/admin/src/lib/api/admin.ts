import { apiDownload, apiRequest, apiRequestWithMeta, apiUpload } from './client';
import type {
  AuditLogRow,
  Coupon,
  CustomerDetail,
  CustomerRow,
  DashboardData,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PageDetail,
  PageSummary,
  Paginated,
  PaginationMeta,
  ProductDetail,
  ProductSummary,
  ShopSettings,
  Staff,
  StockMovement,
  StockRow,
} from './types';

type QueryValue = string | number | boolean | null | undefined;

function query(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    search.set(key, String(value));
  }

  const serialised = search.toString();

  return serialised === '' ? '' : `?${serialised}`;
}

function metaToPagination(meta: Record<string, unknown>): PaginationMeta {
  return {
    current_page: Number(meta.current_page ?? 1),
    last_page: Number(meta.last_page ?? 1),
    per_page: Number(meta.per_page ?? 20),
    total: Number(meta.total ?? 0),
  };
}

/* ------------------------------------------------------------------- auth */

export async function fetchStaff(): Promise<Staff | null> {
  try {
    return await apiRequest<Staff>('/admin/me');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error.status === 401 || error.status === 403)
    ) {
      return null;
    }

    throw error;
  }
}

export function staffLogin(payload: {
  identifier: string;
  password: string;
}): Promise<Staff> {
  return apiRequest<Staff>('/admin/login', { method: 'POST', body: payload });
}

export function staffLogout(): Promise<null> {
  return apiRequest<null>('/admin/logout', { method: 'POST' });
}

/* -------------------------------------------------------------- dashboard */

export function fetchDashboard(): Promise<DashboardData> {
  return apiRequest<DashboardData>('/admin/dashboard');
}

/* ----------------------------------------------------------------- orders */

export interface OrderFilters {
  status?: string;
  city?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
}

export async function fetchOrders(filters: OrderFilters): Promise<Paginated<OrderSummary>> {
  const response = await apiRequestWithMeta<OrderSummary[]>(
    `/admin/orders${query({ ...filters })}`,
  );

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export function fetchOrder(number: string): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/admin/orders/${encodeURIComponent(number)}`);
}

export function transitionOrder(
  number: string,
  payload: {
    status: OrderStatus;
    comment?: string;
    carrier?: string;
    tracking_number?: string;
  },
): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/admin/orders/${encodeURIComponent(number)}/status`, {
    method: 'PATCH',
    body: payload,
  });
}

export function downloadOrdersCsv(filters: OrderFilters): Promise<void> {
  return apiDownload(
    `/admin/orders/export${query({ ...filters })}`,
    `commandes-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export function downloadPackingSlip(number: string): Promise<void> {
  return apiDownload(
    `/admin/orders/${encodeURIComponent(number)}/packing-slip`,
    `bon-livraison-${number}.pdf`,
  );
}

/* --------------------------------------------------------------- products */

export interface ProductFilters {
  q?: string;
  status?: string;
  line?: string;
  page?: number;
}

export async function fetchProducts(
  filters: ProductFilters,
): Promise<Paginated<ProductSummary>> {
  const response = await apiRequestWithMeta<ProductSummary[]>(
    `/admin/products${query({ ...filters })}`,
  );

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export function fetchProduct(id: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/products/${encodeURIComponent(id)}`);
}

export type ProductInput = {
  name: string;
  line: string;
  family: string;
  tag?: string | null;
  short_description: string;
  description: string;
  intensity?: number | null;
  longevity?: number | null;
  sillage?: number | null;
  season?: string | null;
  occasion?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export function createProduct(input: ProductInput): Promise<ProductDetail> {
  return apiRequest<ProductDetail>('/admin/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: Partial<ProductInput>): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function publishProduct(id: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/products/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
  });
}

export function unpublishProduct(id: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/products/${encodeURIComponent(id)}/unpublish`, {
    method: 'POST',
  });
}

export function archiveProduct(id: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export interface VariantInput {
  sku: string;
  label?: string | null;
  size_ml: number;
  price_cents: number;
  compare_at_price_cents?: number | null;
  stock: number;
  low_stock_threshold?: number;
  is_default?: boolean;
}

export function createVariant(productId: string, input: VariantInput): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(
    `/admin/products/${encodeURIComponent(productId)}/variants`,
    { method: 'POST', body: input },
  );
}

export function updateVariant(
  variantId: string,
  input: Partial<VariantInput>,
): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/variants/${encodeURIComponent(variantId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteVariant(variantId: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/variants/${encodeURIComponent(variantId)}`, {
    method: 'DELETE',
  });
}

export function addMedia(
  productId: string,
  input: { url: string; alt: string; type?: string },
): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(
    `/admin/products/${encodeURIComponent(productId)}/media`,
    { method: 'POST', body: input },
  );
}

export function updateMedia(
  mediaId: number,
  input: { alt?: string; position?: number },
): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/media/${mediaId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteMedia(mediaId: number): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/admin/media/${mediaId}`, { method: 'DELETE' });
}

export function syncNotes(
  productId: string,
  notes: Array<{ level: string; name: string }>,
): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(
    `/admin/products/${encodeURIComponent(productId)}/notes`,
    { method: 'PUT', body: { notes } },
  );
}

/* ------------------------------------------------------------------ stock */

export interface StockFilters {
  q?: string;
  low?: boolean;
  page?: number;
}

export async function fetchStock(filters: StockFilters): Promise<Paginated<StockRow>> {
  const response = await apiRequestWithMeta<StockRow[]>(`/admin/stock${query({ ...filters })}`);

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export function adjustStock(input: {
  variant_id: string;
  delta: number;
  reason: 'adjust' | 'restock';
  note?: string;
}): Promise<{ id: string; sku: string; stock: number; status: string }> {
  return apiRequest('/admin/stock/adjust', { method: 'POST', body: input });
}

export async function fetchMovements(
  variantId?: string,
): Promise<Paginated<StockMovement>> {
  const response = await apiRequestWithMeta<StockMovement[]>(
    `/admin/stock/movements${query({ variant_id: variantId })}`,
  );

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export function downloadStockCsv(): Promise<void> {
  return apiDownload('/admin/stock/export', `stock-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function importStockCsv(
  file: File,
): Promise<{ updated: number; errors: Array<{ line: number; message: string }> }> {
  const form = new FormData();
  form.append('file', file);

  return apiUpload('/admin/stock/import', form);
}

/* -------------------------------------------------------------- customers */

export interface CustomerFilters {
  q?: string;
  active?: boolean;
  page?: number;
}

export async function fetchCustomers(
  filters: CustomerFilters,
): Promise<Paginated<CustomerRow>> {
  const response = await apiRequestWithMeta<CustomerRow[]>(
    `/admin/customers${query({ ...filters })}`,
  );

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export function fetchCustomer(id: string): Promise<CustomerDetail> {
  return apiRequest<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}`);
}

export function setCustomerActive(
  id: string,
  isActive: boolean,
): Promise<{ id: string; is_active: boolean }> {
  return apiRequest(`/admin/customers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { is_active: isActive },
  });
}

export function addCustomerNote(
  id: string,
  body: string,
): Promise<{ id: number; body: string; author: string | null; created_at: string }> {
  return apiRequest(`/admin/customers/${encodeURIComponent(id)}/notes`, {
    method: 'POST',
    body: { body },
  });
}

/* ---------------------------------------------------------------- coupons */

export async function fetchCoupons(filters: {
  q?: string;
  active?: boolean;
  page?: number;
}): Promise<Paginated<Coupon>> {
  const response = await apiRequestWithMeta<Coupon[]>(`/admin/coupons${query({ ...filters })}`);

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export interface CouponInput {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  max_discount_cents?: number | null;
  min_subtotal_cents?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  max_uses?: number | null;
  is_active?: boolean;
}

export function createCoupon(input: CouponInput): Promise<Coupon> {
  return apiRequest<Coupon>('/admin/coupons', { method: 'POST', body: input });
}

export function updateCoupon(id: number, input: Partial<CouponInput>): Promise<Coupon> {
  return apiRequest<Coupon>(`/admin/coupons/${id}`, { method: 'PATCH', body: input });
}

export function deleteCoupon(id: number): Promise<Coupon | null> {
  return apiRequest<Coupon | null>(`/admin/coupons/${id}`, { method: 'DELETE' });
}

/* --------------------------------------------------------------- settings */

export function fetchSettings(): Promise<ShopSettings> {
  return apiRequest<ShopSettings>('/admin/settings');
}

export function saveSettings(input: ShopSettings): Promise<ShopSettings> {
  return apiRequest<ShopSettings>('/admin/settings', { method: 'PUT', body: input });
}

/* ------------------------------------------------------------------ pages */

export function fetchPages(): Promise<PageSummary[]> {
  return apiRequest<PageSummary[]>('/admin/pages');
}

export function fetchPage(id: number): Promise<PageDetail> {
  return apiRequest<PageDetail>(`/admin/pages/${id}`);
}

export interface PageInput {
  title: string;
  slug?: string;
  body: string;
  meta_title?: string | null;
  meta_description?: string | null;
  is_published?: boolean;
}

export function createPage(input: PageInput): Promise<PageDetail> {
  return apiRequest<PageDetail>('/admin/pages', { method: 'POST', body: input });
}

export function updatePage(id: number, input: Partial<PageInput>): Promise<PageDetail> {
  return apiRequest<PageDetail>(`/admin/pages/${id}`, { method: 'PATCH', body: input });
}

export function deletePage(id: number): Promise<null> {
  return apiRequest<null>(`/admin/pages/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ audit */

export interface AuditFilters {
  action?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
}

export async function fetchAuditLogs(
  filters: AuditFilters,
): Promise<Paginated<AuditLogRow>> {
  const response = await apiRequestWithMeta<AuditLogRow[]>(
    `/admin/audit-logs${query({ ...filters })}`,
  );

  return { data: response.data, meta: metaToPagination(response.meta) };
}

export function fetchAuditActions(): Promise<string[]> {
  return apiRequest<string[]>('/admin/audit-logs/actions');
}
