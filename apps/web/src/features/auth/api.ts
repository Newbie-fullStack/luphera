import type { Order } from '@/features/cart/types';
import type { ProductSummary } from '@/features/catalog/types';
import { ApiError, apiDownload, apiRequest, apiRequestWithMeta } from '@/lib/api/client';

import type {
  Address,
  AddressPayload,
  AuthUser,
  LoginPayload,
  ProfilePayload,
  RegisterPayload,
} from './types';

/**
 * `GET /me` answers 401 for a visitor: that is a normal state, not an error.
 */
export async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await apiRequest<AuthUser>('/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export function register(payload: RegisterPayload): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/register', { method: 'POST', body: payload });
}

export function login(payload: LoginPayload): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/login', { method: 'POST', body: payload });
}

export function logout(): Promise<null> {
  return apiRequest<null>('/auth/logout', { method: 'POST' });
}

export function updateProfile(payload: ProfilePayload): Promise<AuthUser> {
  return apiRequest<AuthUser>('/me', { method: 'PATCH', body: payload });
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export function resetPassword(payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: payload,
  });
}

export function fetchAddresses(): Promise<Address[]> {
  return apiRequest<Address[]>('/me/addresses');
}

export function createAddress(payload: AddressPayload): Promise<Address> {
  return apiRequest<Address>('/me/addresses', { method: 'POST', body: payload });
}

export function updateAddress(id: string, payload: Partial<AddressPayload>): Promise<Address> {
  return apiRequest<Address>(`/me/addresses/${id}`, { method: 'PATCH', body: payload });
}

export function deleteAddress(id: string): Promise<null> {
  return apiRequest<null>(`/me/addresses/${id}`, { method: 'DELETE' });
}

export function fetchWishlist(): Promise<ProductSummary[]> {
  return apiRequest<ProductSummary[]>('/me/wishlist');
}

export function addToWishlist(productId: string): Promise<ProductSummary> {
  return apiRequest<ProductSummary>('/me/wishlist', {
    method: 'POST',
    body: { product_id: productId },
  });
}

export function removeFromWishlist(productId: string): Promise<null> {
  return apiRequest<null>(`/me/wishlist/${productId}`, { method: 'DELETE' });
}

export function fetchAccountOrders(): Promise<{ orders: Order[]; total: number }> {
  return apiRequestWithMeta<Order[]>('/me/orders').then(({ data, meta }) => ({
    orders: data,
    total: typeof meta.total === 'number' ? meta.total : data.length,
  }));
}

export function fetchAccountOrder(number: string): Promise<Order> {
  return apiRequest<Order>(`/me/orders/${encodeURIComponent(number)}`);
}

export function downloadInvoice(number: string): Promise<Blob> {
  return apiDownload(`/me/orders/${number}/invoice`);
}
