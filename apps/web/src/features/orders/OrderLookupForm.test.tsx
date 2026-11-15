import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOrder } from '@/features/cart/api';
import type { Order } from '@/features/cart/types';
import { OrderLookupForm } from '@/features/orders/OrderLookupForm';
import { ApiError } from '@/lib/api/client';

vi.mock('@/features/cart/api', () => ({
  fetchOrder: vi.fn(),
}));

const mockedFetchOrder = vi.mocked(fetchOrder);

const order: Order = {
  number: 'LPH-261115-1280',
  status: 'pending',
  placed_at: null,
  customer: { name: 'Salma Bennani', phone: '+212612345678', email: null },
  address: { city: 'Casablanca', city_slug: 'casablanca', district: 'Maarif', line1: '12 rue des Orangers', landmark: null },
  note: null,
  items: [],
  totals: { subtotal_cents: 69000, discount_cents: 0, shipping_cents: 2500, total_cents: 71500 },
  coupon_code: null,
  payment_method: 'cod',
  events: [],
  shipment: null,
  tracking: null,
  currency: 'MAD',
};

describe('OrderLookupForm', () => {
  beforeEach(() => {
    mockedFetchOrder.mockReset();
  });

  it('refuses a phone that is not Moroccan without calling the API', async () => {
    const user = userEvent.setup();
    const onFound = vi.fn();

    render(<OrderLookupForm onFound={onFound} />);

    await user.type(screen.getByLabelText('Numéro de commande'), 'LPH-261115-1280');
    await user.type(screen.getByLabelText('Téléphone'), '0102030405');
    await user.click(screen.getByRole('button', { name: 'Afficher la commande' }));

    expect(
      await screen.findByText('Numéro marocain attendu, par exemple 06 12 34 56 78.'),
    ).toBeInTheDocument();
    expect(mockedFetchOrder).not.toHaveBeenCalled();
    expect(onFound).not.toHaveBeenCalled();
  });

  it('looks the order up with the normalized phone and the upper-case number', async () => {
    const user = userEvent.setup();
    const onFound = vi.fn();

    mockedFetchOrder.mockResolvedValue(order);

    render(<OrderLookupForm defaultNumber="lph-261115-1280" onFound={onFound} />);

    await user.type(screen.getByLabelText('Téléphone'), '06 12 34 56 78');
    await user.click(screen.getByRole('button', { name: 'Afficher la commande' }));

    await waitFor(() =>
      expect(mockedFetchOrder).toHaveBeenCalledWith('LPH-261115-1280', {
        phone: '+212612345678',
      }),
    );
    expect(onFound).toHaveBeenCalledWith(order);
  });

  it('explains an unknown order', async () => {
    const user = userEvent.setup();

    mockedFetchOrder.mockRejectedValue(
      new ApiError(404, { code: 'not_found', message: 'Introuvable' }),
    );

    render(<OrderLookupForm onFound={vi.fn()} />);

    await user.type(screen.getByLabelText('Numéro de commande'), 'LPH-000000-0000');
    await user.type(screen.getByLabelText('Téléphone'), '0612345678');
    await user.click(screen.getByRole('button', { name: 'Afficher la commande' }));

    expect(
      await screen.findByText('Aucune commande ne correspond à ces informations.'),
    ).toBeInTheDocument();
  });
});
