import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCartItem,
  fetchCart,
  getCartToken,
  removeCartItem,
  updateCartItem,
} from '@/features/cart/api';
import { CartProvider } from '@/features/cart/CartProvider';
import { useCart } from '@/features/cart/useCart';
import type { Cart } from '@/features/cart/types';

vi.mock('@/features/cart/api', () => ({
  fetchCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  applyCartCoupon: vi.fn(),
  removeCartCoupon: vi.fn(),
  getCartToken: vi.fn(),
}));

const mockedFetchCart = vi.mocked(fetchCart);
const mockedAddItem = vi.mocked(addCartItem);
const mockedUpdateItem = vi.mocked(updateCartItem);
const mockedRemoveItem = vi.mocked(removeCartItem);
const mockedGetToken = vi.mocked(getCartToken);

const cart: Cart = {
  id: '01M7CEEFAVYY6ZH8JX8W2DMMTK',
  item_count: 2,
  items: [],
  coupon: null,
  totals: { subtotal_cents: 138000, discount_cents: 0, shipping_cents: 0, total_cents: 138000 },
  shipping: { free_threshold_cents: 80000, free_shipping: true, remaining_cents: 0 },
  city: null,
  currency: 'MAD',
};

function Probe() {
  const { count, isOpen, addItem, city, setCity, removeItem, updateItem } = useCart();

  return (
    <div>
      <p>count {count}</p>
      <p>open {String(isOpen)}</p>
      <p>city {city ?? 'none'}</p>
      <button type="button" onClick={() => void addItem('variant-1', 2)}>
        add
      </button>
      <button type="button" onClick={() => void updateItem('item-1', 3)}>
        update
      </button>
      <button type="button" onClick={() => void removeItem('item-1')}>
        remove
      </button>
      <button type="button" onClick={() => setCity('rabat')}>
        choose city
      </button>
    </div>
  );
}

function renderProvider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <CartProvider>
        <Probe />
      </CartProvider>
    </QueryClientProvider>,
  );
}

describe('CartProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedFetchCart.mockReset();
    mockedAddItem.mockReset();
    mockedUpdateItem.mockReset();
    mockedRemoveItem.mockReset();
    mockedGetToken.mockReset();
  });

  it('does not create an empty cart for a visitor without a token', () => {
    mockedGetToken.mockReturnValue(null);

    renderProvider();

    expect(screen.getByText('count 0')).toBeInTheDocument();
    expect(mockedFetchCart).not.toHaveBeenCalled();
  });

  it('loads the existing cart when a token is stored', async () => {
    mockedGetToken.mockReturnValue('cart-token');
    mockedFetchCart.mockResolvedValue(cart);

    renderProvider();

    expect(await screen.findByText('count 2')).toBeInTheDocument();
    expect(mockedFetchCart).toHaveBeenCalledWith(null);
  });

  it('adds an item, opens the drawer and refreshes the cart', async () => {
    const user = userEvent.setup();

    mockedGetToken.mockReturnValue('cart-token');
    mockedFetchCart.mockResolvedValue(cart);
    mockedAddItem.mockResolvedValue(cart);

    renderProvider();

    await screen.findByText('count 2');
    await user.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => expect(mockedAddItem).toHaveBeenCalledWith('variant-1', 2));
    expect(screen.getByText('open true')).toBeInTheDocument();
    await waitFor(() => expect(mockedFetchCart.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('updates and removes a line through the API', async () => {
    const user = userEvent.setup();

    mockedGetToken.mockReturnValue('cart-token');
    mockedFetchCart.mockResolvedValue(cart);
    mockedUpdateItem.mockResolvedValue(cart);
    mockedRemoveItem.mockResolvedValue(cart);

    renderProvider();

    await screen.findByText('count 2');
    await user.click(screen.getByRole('button', { name: 'update' }));
    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => expect(mockedUpdateItem).toHaveBeenCalledWith('item-1', 3));
    await waitFor(() => expect(mockedRemoveItem).toHaveBeenCalledWith('item-1'));
  });

  it('remembers the chosen city', async () => {
    const user = userEvent.setup();

    mockedGetToken.mockReturnValue(null);

    renderProvider();

    await user.click(screen.getByRole('button', { name: 'choose city' }));

    expect(screen.getByText('city rabat')).toBeInTheDocument();
    expect(window.localStorage.getItem('luphera.cart.city')).toBe('rabat');
  });
});
