import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchWishlist, removeFromWishlist } from '@/features/auth/api';
import { AccountWishlistPage } from '@/features/account/AccountWishlistPage';
import type { ProductSummary } from '@/features/catalog/types';
import { renderWithAuth } from '@/test/auth';

vi.mock('@/features/auth/api', () => ({
  fetchWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

const mockedFetchWishlist = vi.mocked(fetchWishlist);
const mockedRemove = vi.mocked(removeFromWishlist);

const product: ProductSummary = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZB',
  slug: 'luphera-noir',
  name: 'Luphéra Noir',
  line: 'homme',
  family: 'Boisé ambré',
  tag: null,
  short_description: 'Un sillage profond et fumé.',
  from_price_cents: 69000,
  is_demo: true,
  image: { url: '/images/flacons/flacon-noir.webp', alt: 'Flacon Luphéra Noir' },
};

describe('AccountWishlistPage', () => {
  beforeEach(() => {
    mockedFetchWishlist.mockReset();
    mockedRemove.mockReset();
    mockedFetchWishlist.mockResolvedValue([product]);
    mockedRemove.mockResolvedValue(null);
  });

  it('shows the saved bottles', async () => {
    renderWithAuth(<AccountWishlistPage />);

    expect(await screen.findByRole('link', { name: 'Luphéra Noir' })).toBeInTheDocument();
    expect(screen.getByText('690 MAD')).toBeInTheDocument();
  });

  it('removes a favourite', async () => {
    const user = userEvent.setup();

    renderWithAuth(<AccountWishlistPage />);

    await user.click(await screen.findByRole('button', { name: 'Retirer des favoris' }));

    await waitFor(() => expect(mockedRemove).toHaveBeenCalledWith(product.id));
  });

  it('shows the empty state with a shop link', async () => {
    mockedFetchWishlist.mockResolvedValue([]);

    renderWithAuth(<AccountWishlistPage />);

    expect(await screen.findByText('Aucun favori pour l’instant.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parcourir la boutique' })).toHaveAttribute(
      'href',
      '/boutique',
    );
  });
});
