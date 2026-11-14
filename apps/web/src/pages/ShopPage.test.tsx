import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShopPage } from '@/pages/ShopPage';
import { fetchProducts } from '@/features/catalog/api';
import type { CatalogMeta, ProductPage as ProductPagePayload, ProductSummary } from '@/features/catalog/types';

vi.mock('@/features/catalog/api', () => ({
  fetchProducts: vi.fn(),
  fetchProduct: vi.fn(),
  fetchRelatedProducts: vi.fn(),
  fetchBundles: vi.fn(),
}));

const mockedFetchProducts = vi.mocked(fetchProducts);

const facets: CatalogMeta['facets'] = {
  lines: ['homme', 'femme', 'coffret'],
  families: ['Boisé cuiré', 'Floral vanillé'],
  notes: ['Cuir noir', 'Iris', 'Rose de Damas'],
  price: { min_cents: 39000, max_cents: 119000 },
};

const noir: ProductSummary = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
  slug: 'luphera-noir',
  name: 'Luphéra Noir',
  line: 'homme',
  family: 'Boisé cuiré',
  tag: 'Best-seller',
  short_description: 'Cuir noir, iris, cèdre.',
  from_price_cents: 45000,
  variants_count: 3,
  is_demo: true,
  image: { url: '/images/flacons/flacon-noir.webp', alt: 'Flacon Luphéra Noir' },
};

const aurore: ProductSummary = {
  ...noir,
  id: '01HZZZZZZZZZZZZZZZZZZZZZZY',
  slug: 'luphera-aurore',
  name: 'Luphéra Aurore',
  line: 'femme',
  family: 'Floral vanillé',
  tag: 'Best-seller',
  short_description: 'Rose de Damas, jasmin sambac, iris.',
  image: { url: '/images/flacons/flacon-aurore.webp', alt: 'Flacon Luphéra Aurore' },
};

function page(items: ProductSummary[], total = items.length): ProductPagePayload {
  return {
    items,
    meta: {
      next_cursor: null,
      prev_cursor: null,
      per_page: 12,
      total,
      facets,
    },
  };
}

function renderShop(initialEntry = '/boutique') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ShopPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ShopPage', () => {
  beforeEach(() => {
    mockedFetchProducts.mockReset();
  });

  it('renders the products and the result count', async () => {
    mockedFetchProducts.mockResolvedValue(page([noir, aurore]));

    renderShop();

    expect(await screen.findByRole('heading', { name: 'Luphéra Noir' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Luphéra Aurore' })).toBeInTheDocument();
    expect(screen.getAllByText('2 signatures').length).toBeGreaterThan(0);
    expect(screen.getByText(/Catalogue de démonstration/)).toBeInTheDocument();
  });

  it('reads the filters from the URL', async () => {
    mockedFetchProducts.mockResolvedValue(page([noir]));

    renderShop('/boutique?ligne=homme&note=Cuir%20noir&tri=prix-asc');

    await waitFor(() => {
      expect(mockedFetchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          line: 'homme',
          notes: ['Cuir noir'],
          sort: 'prix-asc',
          per_page: 12,
        }),
      );
    });
  });

  it('updates the query when a line chip is selected', async () => {
    const user = userEvent.setup();
    mockedFetchProducts.mockResolvedValue(page([noir]));

    renderShop();

    await screen.findByRole('heading', { name: 'Luphéra Noir' });
    await user.click(screen.getByRole('button', { name: 'Femme' }));

    await waitFor(() => {
      expect(mockedFetchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ line: 'femme' }),
      );
    });
  });

  it('shows the empty state when nothing matches', async () => {
    mockedFetchProducts.mockResolvedValue(page([], 0));

    renderShop('/boutique?q=introuvable');

    expect(await screen.findByText('Aucune signature ne correspond.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réinitialiser les filtres' })).toBeInTheDocument();
  });

  it('shows the error state and retries', async () => {
    const user = userEvent.setup();
    mockedFetchProducts.mockRejectedValueOnce(new Error('offline'));
    mockedFetchProducts.mockResolvedValue(page([noir]));

    renderShop();

    expect(await screen.findByText("La collection n'a pas pu être chargée.")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { name: 'Luphéra Noir' })).toBeInTheDocument();
  });
});
