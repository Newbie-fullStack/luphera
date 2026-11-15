import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProduct, fetchRelatedProducts } from '@/features/catalog/api';
import type { ProductDetail, ProductSummary } from '@/features/catalog/types';
import { CartContext, type CartContextValue } from '@/features/cart/useCart';
import { ApiError } from '@/lib/api/client';
import { ProductPage } from '@/pages/ProductPage';

vi.mock('@/features/catalog/api', () => ({
  fetchProducts: vi.fn(),
  fetchProduct: vi.fn(),
  fetchRelatedProducts: vi.fn(),
  fetchBundles: vi.fn(),
}));

const mockedFetchProduct = vi.mocked(fetchProduct);
const mockedFetchRelated = vi.mocked(fetchRelatedProducts);
const addItem = vi.fn<CartContextValue['addItem']>().mockResolvedValue(undefined);

const cartValue: CartContextValue = {
  cart: null,
  isLoading: false,
  count: 0,
  isOpen: false,
  openCart: vi.fn(),
  closeCart: vi.fn(),
  city: null,
  setCity: vi.fn(),
  addItem,
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  applyCoupon: vi.fn(),
  removeCoupon: vi.fn(),
  refresh: vi.fn(),
};

const related: ProductSummary = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZZY',
  slug: 'luphera-ambre',
  name: 'Luphéra Ambre',
  line: 'homme',
  family: 'Ambré épicé',
  tag: 'Nouveau',
  short_description: 'Rose turque, oud léger, labdanum.',
  from_price_cents: 45000,
  variants_count: 3,
  is_demo: true,
  image: { url: '/images/flacons/flacon-ambre.webp', alt: 'Flacon Luphéra Ambre' },
};

const product: ProductDetail = {
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
  image: { url: '/images/flacons/flacon-noir.webp', alt: 'Flacon Luphéra Noir, verre noir et or' },
  description: 'Un boisé cuiré sombre et profond.',
  intensity: 4,
  longevity: 5,
  sillage: 4,
  season: 'Automne, hiver',
  occasion: 'Soirée, bureau',
  seo: { title: 'Luphéra Noir — eau de parfum | Luphéra', description: null },
  variants: [
    {
      id: '01HAAAAAAAAAAAAAAAAAAAAAAA1',
      sku: 'LPH-NOIR-30',
      label: '30 ml',
      size_ml: 30,
      price_cents: 45000,
      compare_at_price_cents: null,
      stock_status: 'in_stock',
      is_default: false,
    },
    {
      id: '01HAAAAAAAAAAAAAAAAAAAAAAA2',
      sku: 'LPH-NOIR-50',
      label: '50 ml',
      size_ml: 50,
      price_cents: 69000,
      compare_at_price_cents: null,
      stock_status: 'in_stock',
      is_default: true,
    },
    {
      id: '01HAAAAAAAAAAAAAAAAAAAAAAA3',
      sku: 'LPH-NOIR-100',
      label: '100 ml',
      size_ml: 100,
      price_cents: 99000,
      compare_at_price_cents: null,
      stock_status: 'low_stock',
      is_default: false,
    },
  ],
  notes: {
    top: ['Bergamote', 'Poivre noir', 'Cardamome'],
    heart: ['Cuir noir', 'Iris', 'Cèdre'],
    base: ['Ambre gris', 'Patchouli', 'Mousse de chêne'],
  },
  media: [
    { type: 'photo', url: '/images/flacons/flacon-noir.webp', alt: 'Flacon Luphéra Noir, verre noir et or' },
  ],
  bundle: null,
};

function renderProduct(initialEntry = '/produit/luphera-noir') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <CartContext.Provider value={cartValue}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="produit/:slug" element={<ProductPage />} />
          </Routes>
        </MemoryRouter>
      </CartContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ProductPage', () => {
  beforeEach(() => {
    mockedFetchProduct.mockReset();
    mockedFetchRelated.mockReset();
    addItem.mockClear();
    mockedFetchRelated.mockResolvedValue([related]);
  });

  it('renders the product, its default size and its price', async () => {
    mockedFetchProduct.mockResolvedValue(product);

    renderProduct();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Luphéra Noir' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /50 ml/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByText('690 MAD').length).toBeGreaterThan(0);
    expect(screen.getByText('Boisé cuiré')).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
  });

  it('updates the price when another size is chosen', async () => {
    const user = userEvent.setup();
    mockedFetchProduct.mockResolvedValue(product);

    renderProduct();

    await screen.findByRole('heading', { level: 1, name: 'Luphéra Noir' });
    await user.click(screen.getByRole('radio', { name: /30 ml/ }));

    expect(screen.getAllByText('450 MAD').length).toBeGreaterThan(0);
  });

  it('shows the olfactory pyramid, meters and usage advice', async () => {
    mockedFetchProduct.mockResolvedValue(product);

    renderProduct();

    await screen.findByRole('heading', { level: 1, name: 'Luphéra Noir' });

    expect(screen.getByText('Notes de tête')).toBeInTheDocument();
    expect(screen.getByText('Bergamote')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Intensité : 4 sur 5' })).toBeInTheDocument();
    expect(screen.getByText(/Vaporisez à 15 cm/)).toBeInTheDocument();
  });

  it('adds the selected size to the cart', async () => {
    const user = userEvent.setup();
    mockedFetchProduct.mockResolvedValue(product);

    renderProduct();

    await screen.findByRole('heading', { level: 1, name: 'Luphéra Noir' });

    const buttons = screen.getAllByRole('button', { name: 'Ajouter au panier' });

    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => expect(button).toBeEnabled());

    await user.click(buttons[0]);

    expect(addItem).toHaveBeenCalledWith('01HAAAAAAAAAAAAAAAAAAAAAAA2', 1);
    expect(screen.getByText(/Paiement à la livraison\. Les prix affichés/)).toBeInTheDocument();
  });

  it('shows related products', async () => {
    mockedFetchProduct.mockResolvedValue(product);

    renderProduct();

    expect(
      await screen.findByRole('heading', { name: 'Luphéra Ambre' }),
    ).toBeInTheDocument();
  });

  it('shows a dedicated 404 state for an unknown slug', async () => {
    mockedFetchProduct.mockRejectedValue(
      new ApiError(404, { code: 'not_found', message: 'Introuvable' }),
    );

    renderProduct('/produit/inconnu');

    expect(await screen.findByText("Cette signature n'existe pas.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la collection' })).toHaveAttribute(
      'href',
      '/boutique',
    );
  });
});
