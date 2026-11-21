export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Staff {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  roles: string[];
  permissions: string[];
  last_login_at: string | null;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'failed_delivery';

export interface OrderSummary {
  number: string;
  status: OrderStatus;
  placed_at: string;
  customer: { name: string; phone: string };
  city: string | null;
  district: string | null;
  items_count: number;
  total_cents: number;
  needs_confirmation: boolean;
}

export interface OrderItem {
  product_slug: string;
  product_name: string;
  variant_label: string | null;
  sku: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

export interface OrderEvent {
  status: OrderStatus;
  at: string | null;
  author?: string | null;
  comment: string | null;
}

export interface OrderShipment {
  carrier: string | null;
  tracking_number: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface OrderDetail {
  number: string;
  status: OrderStatus;
  placed_at: string;
  customer: { name: string; phone: string; email: string | null };
  address: {
    city?: string;
    city_slug?: string;
    district?: string;
    line1?: string;
    landmark?: string | null;
  };
  note: string | null;
  items: OrderItem[];
  totals: {
    subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    total_cents: number;
  };
  coupon_code: string | null;
  payment_method: string;
  events: OrderEvent[];
  shipment: OrderShipment | null;
  tracking: null;
  currency: string;
  items_count: number;
  needs_confirmation: boolean;
}

export interface DashboardData {
  revenue_30d_cents: number;
  orders_30d: number;
  orders_today: number;
  orders_pending: number;
  average_basket_30d_cents: number;
  confirmation_rate_30d: number;
  customers_total: number;
  customers_new_30d: number;
  low_stock: Array<{
    id: string;
    sku: string;
    label: string | null;
    stock: number;
    threshold: number;
    product: { slug: string; name: string };
  }>;
  top_products: Array<{ name: string; quantity: number; revenue_cents: number }>;
  sales_by_city: Array<{ city: string; orders: number; revenue_cents: number }>;
  series: Array<{ date: string; orders: number; revenue_cents: number }>;
}

export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductLine = 'homme' | 'femme' | 'coffret';

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  line: ProductLine;
  family: string;
  status: ProductStatus;
  from_price_cents: number;
  stock_total: number;
  variants_count: number;
  published_at: string | null;
  image: { url: string; alt: string | null } | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  label: string | null;
  size_ml: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock: number;
  low_stock_threshold: number;
  is_default: boolean;
}

export interface ProductNote {
  level: 'top' | 'heart' | 'base';
  name: string;
}

export interface ProductMedia {
  id: number;
  type: string;
  url: string;
  alt: string;
  position: number;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  line: ProductLine;
  family: string;
  tag: string | null;
  short_description: string;
  description: string;
  status: ProductStatus;
  intensity: number | null;
  longevity: number | null;
  sillage: number | null;
  season: string | null;
  occasion: string | null;
  from_price_cents: number;
  position: number;
  is_demo: boolean;
  seo: { title: string | null; description: string | null };
  published_at: string | null;
  stock_total: number;
  variants: ProductVariant[];
  notes: ProductNote[];
  media: ProductMedia[];
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StockRow {
  id: string;
  sku: string;
  label: string | null;
  size_ml: number;
  stock: number;
  threshold: number;
  status: StockStatus;
  product: { slug: string; name: string };
}

export interface StockMovement {
  id: number;
  quantity: number;
  reason: string;
  author: string | null;
  note: string | null;
  at: string;
  sku: string | null;
  product: string | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  marketing_opt_in: boolean;
  created_at: string;
  orders_count: number;
  spent_cents: number;
  last_order_at: string | null;
}

export type CustomerSegment = 'vip' | 'new' | 'regular' | 'inactive';

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  marketing_opt_in: boolean;
  created_at: string;
  last_login_at: string | null;
  orders_count: number;
  spent_cents: number;
  segment: CustomerSegment;
  orders: Array<{
    number: string;
    status: OrderStatus;
    placed_at: string;
    total_cents: number;
    items_count: number;
  }>;
  addresses: Array<{
    id: string;
    label: string | null;
    city: string | null;
    district: string | null;
    line1: string;
    is_default: boolean;
  }>;
  notes: Array<{
    id: number;
    body: string;
    author: string | null;
    created_at: string;
  }>;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  max_discount_cents: number | null;
  min_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  is_usable: boolean;
  created_at: string;
}

export interface PageSummary {
  id: number;
  slug: string;
  title: string;
  is_published: boolean;
  position: number;
  updated_at: string;
}

export interface PageDetail extends PageSummary {
  body: string;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

export interface ShopSettings {
  brand: { tagline: string; whatsapp: string; email: string };
  announcement: { text: string; active: boolean };
  shipping: { flat_fee_cents: number; free_threshold_cents: number };
}

export interface AuditLogRow {
  id: number;
  action: string;
  subject_type: string | null;
  subject_label: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  author: string | null;
  at: string;
}

export type ContactMessageStatus = 'new' | 'read' | 'replied' | 'archived';

export interface ContactMessageSummary {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  status: ContactMessageStatus;
  excerpt: string;
  ip: string | null;
  created_at: string | null;
  read_at: string | null;
  replied_at: string | null;
}

export interface ContactMessageDetail extends ContactMessageSummary {
  body: string;
  user_agent: string | null;
  customer: { id: string; name: string; phone: string } | null;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewRow {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  status: ReviewStatus;
  product: { slug: string; name: string } | null;
  moderator: string | null;
  moderation_note: string | null;
  moderated_at: string | null;
  created_at: string | null;
}