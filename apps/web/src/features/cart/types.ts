import type { StockStatus } from '@/features/catalog/types';

export interface CartImage {
  url: string;
  alt: string;
}

export interface CartLine {
  id: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  stock_status: StockStatus;
  max_quantity: number;
  variant: {
    id: string;
    label: string;
    size_ml: number;
  };
  product: {
    slug: string;
    name: string;
    image: CartImage | null;
  };
}

export interface CartCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount_cents: number;
  applies: boolean;
}

export interface CartTotals {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
}

export interface CartShipping {
  free_threshold_cents: number;
  free_shipping: boolean;
  remaining_cents: number;
}

export interface CartCity {
  slug: string;
  name: string;
  delivery_days: string;
}

export interface Cart {
  id: string;
  item_count: number;
  items: CartLine[];
  coupon: CartCoupon | null;
  totals: CartTotals;
  shipping: CartShipping;
  city: CartCity | null;
  currency: string;
}

export interface City {
  slug: string;
  name: string;
  fee_cents: number;
  delivery_days: string;
}

export interface ShippingQuote {
  city: { slug: string; name: string };
  fee_cents: number;
  delivery_days: string;
  free_threshold_cents: number;
  flat_fee_cents: number;
  free_shipping: boolean;
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
  comment: string | null;
}

export interface Order {
  number: string;
  status: OrderStatus;
  placed_at: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  address: {
    city: string;
    city_slug: string;
    district: string;
    line1: string;
    landmark: string | null;
  };
  note: string | null;
  items: OrderItem[];
  totals: CartTotals;
  coupon_code: string | null;
  payment_method: 'cod';
  events: OrderEvent[];
  shipment: {
    carrier: string | null;
    tracking_number: string | null;
    status: string;
    shipped_at: string | null;
    delivered_at: string | null;
  } | null;
  tracking: { token: string } | null;
  currency: string;
}

export interface CheckoutPayload {
  customer_name: string;
  phone: string;
  email?: string | null;
  city: string;
  district: string;
  address: string;
  landmark?: string | null;
  note?: string | null;
  payment_method: 'cod';
  terms: true;
}
