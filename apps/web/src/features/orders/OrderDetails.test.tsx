import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Order } from '@/features/cart/types';
import { OrderDetails } from '@/features/orders/OrderDetails';

const order: Order = {
  number: 'LPH-261115-1280',
  status: 'confirmed',
  placed_at: '2026-11-15T02:12:00+00:00',
  customer: { name: 'Salma Bennani', phone: '+212612345678', email: 'salma@exemple.ma' },
  address: {
    city: 'Casablanca',
    city_slug: 'casablanca',
    district: 'Maarif',
    line1: '12 rue des Orangers',
    landmark: 'En face de la pharmacie',
  },
  note: 'Appeler avant de livrer.',
  items: [
    {
      product_slug: 'luphera-noir',
      product_name: 'Luphéra Noir',
      variant_label: '50 ml',
      sku: 'LPH-NOIR-50',
      unit_price_cents: 69000,
      quantity: 1,
      line_total_cents: 69000,
    },
  ],
  totals: { subtotal_cents: 69000, discount_cents: 6900, shipping_cents: 2500, total_cents: 64600 },
  coupon_code: 'LUPHERA10',
  payment_method: 'cod',
  events: [
    { status: 'pending', at: '2026-11-15T02:12:00+00:00', comment: null },
    { status: 'confirmed', at: null, comment: 'Confirmée par téléphone.' },
  ],
  shipment: null,
  tracking: null,
  currency: 'MAD',
};

describe('OrderDetails', () => {
  it('shows the order, the frozen lines and the totals', () => {
    render(<OrderDetails order={order} />);

    expect(screen.getByText('LPH-261115-1280')).toBeInTheDocument();
    expect(screen.getAllByText('Confirmée').length).toBeGreaterThan(0);
    expect(screen.getByText('Luphéra Noir')).toBeInTheDocument();
    expect(screen.getByText('50 ml × 1')).toBeInTheDocument();
    expect(screen.getAllByText('646 MAD').length).toBeGreaterThan(0);
    expect(screen.getByText(/Remise · LUPHERA10/)).toBeInTheDocument();
  });

  it('shows the address, the note and the event history', () => {
    render(<OrderDetails order={order} />);

    expect(screen.getByText('12 rue des Orangers, Maarif')).toBeInTheDocument();
    expect(screen.getByText('Casablanca')).toBeInTheDocument();
    expect(screen.getByText('Appeler avant de livrer.')).toBeInTheDocument();
    expect(screen.getByText('Confirmée par téléphone.')).toBeInTheDocument();
    expect(screen.getByText('Pas encore expédiée.')).toBeInTheDocument();
  });

  it('renders a shipment when the carrier has one', () => {
    render(
      <OrderDetails
        order={{
          ...order,
          shipment: {
            carrier: 'Amana',
            tracking_number: 'AM123456789',
            status: 'shipped',
            shipped_at: '2026-11-16T08:00:00+00:00',
            delivered_at: null,
          },
        }}
      />,
    );

    expect(screen.getByText('Amana')).toBeInTheDocument();
    expect(screen.getByText('AM123456789')).toBeInTheDocument();
  });

  it('never invents a date for a missing event timestamp', () => {
    render(<OrderDetails order={order} />);

    const items = screen.getAllByRole('listitem');
    const confirmed = items.find((item) => item.textContent?.includes('Confirmée par téléphone.'));

    expect(confirmed?.textContent).not.toMatch(/\d{4}/);
  });
});
