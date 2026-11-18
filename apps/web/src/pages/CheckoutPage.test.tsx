import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCities, placeOrder } from '@/features/cart/api';
import type { Cart, Order } from '@/features/cart/types';
import { CartContext, type CartContextValue } from '@/features/cart/useCart';
import { AuthContext } from '@/features/auth/useAuth';
import { rememberOrderToken } from '@/features/orders/storage';
import { ApiError } from '@/lib/api/client';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { authValue } from '@/test/auth';

vi.mock('@/features/cart/api', () => ({
  fetchCities: vi.fn(),
  placeOrder: vi.fn(),
}));

vi.mock('@/features/orders/storage', () => ({
  rememberOrderToken: vi.fn(),
}));

const mockedCities = vi.mocked(fetchCities);
const mockedPlaceOrder = vi.mocked(placeOrder);
const mockedRemember = vi.mocked(rememberOrderToken);

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

const order: Order = {
  number: 'LPH-261115-1280',
  status: 'pending',
  placed_at: '2026-11-15T02:12:00+00:00',
  customer: { name: 'Salma Bennani', phone: '+212612345678', email: null },
  address: {
    city: 'Casablanca',
    city_slug: 'casablanca',
    district: 'Maarif',
    line1: '12 rue des Orangers',
    landmark: null,
  },
  note: null,
  items: [],
  totals: { subtotal_cents: 69000, discount_cents: 0, shipping_cents: 2500, total_cents: 71500 },
  coupon_code: null,
  payment_method: 'cod',
  events: [],
  shipment: null,
  tracking: { token: 'a'.repeat(40) },
  currency: 'MAD',
};

function ConfirmationStub() {
  const { number } = useParams<{ number: string }>();

  return <p>confirmation {number}</p>;
}

function renderCheckout(value: Partial<CartContextValue> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const context: CartContextValue = {
    cart,
    isLoading: false,
    count: 1,
    isOpen: false,
    openCart: vi.fn(),
    closeCart: vi.fn(),
    city: null,
    setCity: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    refresh: vi.fn(),
    ...value,
  };

  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue()}>
        <CartContext.Provider value={context}>
          <MemoryRouter initialEntries={['/commande']}>
            <Routes>
              <Route path="commande" element={<CheckoutPage />} />
              <Route path="commande/confirmation/:number" element={<ConfirmationStub />} />
            </Routes>
          </MemoryRouter>
        </CartContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

async function fillValidForm() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Nom complet'), 'Salma Bennani');
  await user.type(screen.getByLabelText('Téléphone'), '0612345678');
  await user.selectOptions(await screen.findByLabelText('Ville'), 'casablanca');
  await user.type(screen.getByLabelText('Quartier'), 'Maarif');
  await user.type(screen.getByLabelText('Adresse', { exact: true }), '12 rue des Orangers');
  await user.click(screen.getByRole('checkbox'));

  return user;
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockedCities.mockReset();
    mockedPlaceOrder.mockReset();
    mockedRemember.mockReset();
    mockedCities.mockResolvedValue([
      { slug: 'casablanca', name: 'Casablanca', fee_cents: 2500, delivery_days: '24 à 48 h' },
    ]);
  });

  it('shows the server totals and the delivery cities', async () => {
    renderCheckout();

    expect(screen.getByRole('heading', { name: 'Finaliser la commande' })).toBeInTheDocument();
    expect(screen.getByText('725 MAD')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Casablanca/ })).toBeInTheDocument();
  });

  it('refuses an empty form and focuses the first error', async () => {
    const user = userEvent.setup();

    renderCheckout();

    await user.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    expect(await screen.findByText('Indiquez votre nom complet.')).toBeInTheDocument();
    expect(mockedPlaceOrder).not.toHaveBeenCalled();
    expect(document.activeElement).toHaveAttribute('id', 'customer_name');
  });

  it('rejects a phone that is not Moroccan', async () => {
    const user = userEvent.setup();

    renderCheckout();

    await user.type(screen.getByLabelText('Nom complet'), 'Salma Bennani');
    await user.type(screen.getByLabelText('Téléphone'), '0102030405');
    await user.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    expect(
      await screen.findByText('Numéro marocain attendu, par exemple 06 12 34 56 78.'),
    ).toBeInTheDocument();
    expect(mockedPlaceOrder).not.toHaveBeenCalled();
  });

  it('sends the normalized phone and the idempotency key, then opens the confirmation', async () => {
    mockedPlaceOrder.mockResolvedValue(order);

    renderCheckout();

    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    await waitFor(() => expect(mockedPlaceOrder).toHaveBeenCalledTimes(1));

    const [payload, key] = mockedPlaceOrder.mock.calls[0] ?? [];

    expect(payload).toMatchObject({
      customer_name: 'Salma Bennani',
      phone: '+212612345678',
      city: 'casablanca',
      district: 'Maarif',
      address: '12 rue des Orangers',
      payment_method: 'cod',
      terms: true,
    });
    expect(typeof key).toBe('string');
    expect(key).not.toBe('');
    expect(mockedRemember).toHaveBeenCalledWith(order.number, order.tracking?.token);
    expect(await screen.findByText(`confirmation ${order.number}`)).toBeInTheDocument();
  });

  it('prevents a double submit while the order is in flight', async () => {
    let resolveOrder: ((value: Order) => void) | undefined;

    mockedPlaceOrder.mockImplementation(
      () =>
        new Promise<Order>((resolve) => {
          resolveOrder = resolve;
        }),
    );

    renderCheckout();

    const user = await fillValidForm();
    const submit = screen.getByRole('button', { name: 'Confirmer la commande' });

    await user.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());

    await user.click(submit);
    expect(mockedPlaceOrder).toHaveBeenCalledTimes(1);

    resolveOrder?.(order);

    expect(await screen.findByText(`confirmation ${order.number}`)).toBeInTheDocument();
  });

  it('maps a server validation error under the field', async () => {
    mockedPlaceOrder.mockRejectedValue(
      new ApiError(422, {
        code: 'validation_error',
        message: 'Les données envoyées sont invalides.',
        fields: { district: ['Ce quartier est inconnu.'] },
      }),
    );

    renderCheckout();

    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    expect(await screen.findByText('Ce quartier est inconnu.')).toBeInTheDocument();
    expect(screen.getByText('Corrigez les champs signalés.')).toBeInTheDocument();
  });

  it('explains a cart that changed since the last visit', async () => {
    mockedPlaceOrder.mockRejectedValue(
      new ApiError(422, { code: 'insufficient_stock', message: 'Stock insuffisant.' }),
    );

    renderCheckout();

    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Confirmer la commande' }));

    expect(
      await screen.findByText(
        'Le panier a changé depuis votre dernière visite. Vérifiez les quantités.',
      ),
    ).toBeInTheDocument();
  });

  it('shows an empty state instead of the form when the cart is empty', () => {
    renderCheckout({ cart: { ...cart, item_count: 0, items: [] }, count: 0 });

    expect(screen.getByRole('heading', { name: 'Votre panier est vide' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmer la commande' })).not.toBeInTheDocument();
  });
});
