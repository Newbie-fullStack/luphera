import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addCartItem,
  applyCartCoupon,
  fetchCart,
  getCartToken,
  removeCartCoupon,
  removeCartItem,
  updateCartItem,
} from './api';
import { CartContext, type CartContextValue } from './useCart';

const CITY_KEY = 'luphera.cart.city';

function readCity(): string | null {
  try {
    return window.localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
}

/**
 * Client-side cart state.
 *
 * The server owns every amount: this provider only stores the opaque guest
 * token, the chosen city and the drawer state. Each mutation returns a fresh
 * cart payload, so the totals on screen are always the ones the server will
 * charge.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean>(() => getCartToken() !== null);
  const [city, setCityState] = useState<string | null>(() => readCity());
  const [isOpen, setOpen] = useState(false);

  const cartQuery = useQuery({
    queryKey: ['cart', city],
    queryFn: () => fetchCart(city),
    enabled: hasToken,
    staleTime: 20_000,
    retry: 1,
  });

  const refresh = useCallback(() => {
    setHasToken(getCartToken() !== null);
    void queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  const setCity = useCallback((next: string | null) => {
    setCityState(next);

    try {
      if (next === null) {
        window.localStorage.removeItem(CITY_KEY);
      } else {
        window.localStorage.setItem(CITY_KEY, next);
      }
    } catch {
      // Storage unavailable: the choice still holds for this page view.
    }
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity: number) => {
      await addCartItem(variantId, quantity);
      setOpen(true);
      refresh();
    },
    [refresh],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      await updateCartItem(itemId, quantity);
      refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await removeCartItem(itemId);
      refresh();
    },
    [refresh],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      await applyCartCoupon(code);
      refresh();
    },
    [refresh],
  );

  const removeCoupon = useCallback(async () => {
    await removeCartCoupon();
    refresh();
  }, [refresh]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart: cartQuery.data ?? null,
      isLoading: cartQuery.isPending && hasToken,
      count: cartQuery.data?.item_count ?? 0,
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      city,
      setCity,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      refresh,
    }),
    [
      addItem,
      applyCoupon,
      cartQuery.data,
      cartQuery.isPending,
      city,
      hasToken,
      isOpen,
      refresh,
      removeCoupon,
      removeItem,
      setCity,
      updateItem,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
