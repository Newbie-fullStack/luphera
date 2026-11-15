import { createContext, useContext } from 'react';

import type { Cart } from './types';

export interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  city: string | null;
  setCity: (city: string | null) => void;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refresh: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);

  if (value === null) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return value;
}
