import { apiRequest, apiRequestWithMeta, type RequestOptions } from '@/lib/api/client';

import type { Cart, CheckoutPayload, City, Order, ShippingQuote } from './types';

const CART_TOKEN_KEY = 'luphera.cart.token';

export function getCartToken(): string | null {
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCartToken(token: string): void {
  try {
    window.localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // Private mode without storage: the cart still works for this page view.
  }
}

export function clearCartToken(): void {
  try {
    window.localStorage.removeItem(CART_TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

function cartHeaders(): Record<string, string> {
  const token = getCartToken();

  return token === null ? {} : { 'X-Cart-Token': token };
}

/**
 * Every cart response carries its opaque token in `meta.cart_token`; storing
 * it here means a guest keeps the same cart after a reload.
 */
async function cartRequest(path: string, options: RequestOptions = {}) {
  const { data, meta } = await apiRequestWithMeta<Cart>(path, {
    ...options,
    headers: cartHeaders(),
  });

  const token = meta.cart_token;

  if (typeof token === 'string' && token !== '') {
    setCartToken(token);
  }

  return data;
}

export function fetchCart(city?: string | null): Promise<Cart> {
  const search = city ? `?city=${encodeURIComponent(city)}` : '';

  return cartRequest(`/cart${search}`);
}

export function addCartItem(variantId: string, quantity: number): Promise<Cart> {
  return cartRequest('/cart/items', {
    method: 'POST',
    body: { variant_id: variantId, quantity },
  });
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return cartRequest(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: { quantity },
  });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return cartRequest(`/cart/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

export function applyCartCoupon(code: string): Promise<Cart> {
  return cartRequest('/cart/coupon', { method: 'POST', body: { code } });
}

export function removeCartCoupon(): Promise<Cart> {
  return cartRequest('/cart/coupon', { method: 'DELETE' });
}

export async function fetchCities(): Promise<City[]> {
  return apiRequest<City[]>('/shipping/cities');
}

export function fetchShippingQuote(city: string, subtotalCents: number): Promise<ShippingQuote> {
  const params = new URLSearchParams({ city, subtotal_cents: String(subtotalCents) });

  return apiRequest<ShippingQuote>(`/shipping/quote?${params.toString()}`);
}

export function placeOrder(payload: CheckoutPayload, idempotencyKey: string): Promise<Order> {
  return apiRequest<Order>('/orders', {
    method: 'POST',
    body: payload,
    headers: { ...cartHeaders(), 'Idempotency-Key': idempotencyKey },
  });
}

export function fetchOrder(
  number: string,
  proof: { token?: string; phone?: string },
): Promise<Order> {
  const params = new URLSearchParams();

  if (proof.token) params.set('token', proof.token);
  if (proof.phone) params.set('phone', proof.phone);

  return apiRequest<Order>(
    `/orders/${encodeURIComponent(number)}?${params.toString()}`,
  );
}
