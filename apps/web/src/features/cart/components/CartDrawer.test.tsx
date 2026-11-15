import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { Cart } from '@/features/cart/types';
import { CartContext, type CartContextValue } from '@/features/cart/useCart';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import { ApiError } from '@/lib/api/client';

const cart: Cart = {
  id: '01M7CEEFAVYY6ZH8JX8W2DMMTK',
  item_count: 1,
  items: [
    {
      id: '01M7CEEFAVYY6ZH8JX8W2DMMTM',
      quantity: 1,
      unit_price_cents: 69000,
      line_total_cents: 69000,
      stock_status: 'in_stock',
      max_quantity: 10,
      variant: { id: '01M7CEEFAVYY6ZH8JX8W2DMMTN', label: '50 ml', size_ml: 50 },
      product: {
        slug: 'luphera-noir',
        name: 'Luphéra Noir',
        image: { url: '/images/flacons/flacon-noir.webp', alt: 'Flacon Luphéra Noir' },
      },
    },
  ],
  coupon: null,
  totals: {
    subtotal_cents: 69000,
    discount_cents: 0,
    shipping_cents: 3500,
    total_cents: 72500,
  },
  shipping: { free_threshold_cents: 80000, free_shipping: false, remaining_cents: 11000 },
  city: null,
  currency: 'MAD',
};

function cartValue(overrides: Partial<CartContextValue> = {}): CartContextValue {
  return {
    cart,
    isLoading: false,
    count: 1,
    isOpen: true,
    openCart: vi.fn(),
    closeCart: vi.fn(),
    city: null,
    setCity: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    applyCoupon: vi.fn().mockResolvedValue(undefined),
    removeCoupon: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn(),
    ...overrides,
  };
}

function renderDrawer(value: CartContextValue) {
  return render(
    <MemoryRouter>
      <CartContext.Provider value={value}>
        <CartDrawer />
      </CartContext.Provider>
    </MemoryRouter>,
  );
}

describe('CartDrawer', () => {
  it('shows the line, the totals and the free shipping progress', () => {
    renderDrawer(cartValue());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Luphéra Noir' })).toBeInTheDocument();
    expect(screen.getByText('725 MAD')).toBeInTheDocument();
    expect(screen.getByText(/Plus que 110 MAD/)).toBeInTheDocument();
  });

  it('applies a coupon through the server', async () => {
    const user = userEvent.setup();
    const value = cartValue();

    renderDrawer(value);

    await user.type(screen.getByRole('textbox', { name: 'Code promo' }), 'luphera10');
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));

    await waitFor(() => expect(value.applyCoupon).toHaveBeenCalledWith('luphera10'));
  });

  it('keeps the server message when a coupon is refused', async () => {
    const user = userEvent.setup();
    const applyCoupon = vi
      .fn()
      .mockRejectedValue(
        new ApiError(422, {
          code: 'coupon_minimum',
          message: "Ce code s'applique à partir de 500 MAD d'achat.",
        }),
      );

    renderDrawer(cartValue({ applyCoupon }));

    await user.type(screen.getByRole('textbox', { name: 'Code promo' }), 'LUPHERA10');
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));

    expect(
      await screen.findByText("Ce code s'applique à partir de 500 MAD d'achat."),
    ).toBeInTheDocument();
  });

  it('removes a line', async () => {
    const user = userEvent.setup();
    const value = cartValue();

    renderDrawer(value);

    await user.click(screen.getByRole('button', { name: 'Retirer Luphéra Noir' }));

    await waitFor(() =>
      expect(value.removeItem).toHaveBeenCalledWith('01M7CEEFAVYY6ZH8JX8W2DMMTM'),
    );
  });

  it('shows the empty state and the discovery link', () => {
    renderDrawer(
      cartValue({
        cart: { ...cart, item_count: 0, items: [], totals: { subtotal_cents: 0, discount_cents: 0, shipping_cents: 0, total_cents: 0 } },
        count: 0,
      }),
    );

    expect(screen.getByText('Votre panier est vide.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuer la découverte' })).toHaveAttribute(
      'href',
      '/boutique',
    );
  });

  it('shows the applied coupon and removes it', async () => {
    const user = userEvent.setup();
    const value = cartValue({
      cart: {
        ...cart,
        coupon: {
          code: 'LUPHERA10',
          type: 'percentage',
          value: 10,
          discount_cents: 6900,
          applies: true,
        },
        totals: { subtotal_cents: 69000, discount_cents: 6900, shipping_cents: 3500, total_cents: 65600 },
      },
    });

    renderDrawer(value);

    expect(screen.getByText(/Code LUPHERA10 appliqué/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirer le code LUPHERA10' }));

    await waitFor(() => expect(value.removeCoupon).toHaveBeenCalled());
  });
});
