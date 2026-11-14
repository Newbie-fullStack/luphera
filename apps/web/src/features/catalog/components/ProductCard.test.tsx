import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ProductCard } from '@/features/catalog/components/ProductCard';
import type { ProductSummary } from '@/features/catalog/types';

const product: ProductSummary = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
  slug: 'luphera-noir',
  name: 'Luphéra Noir',
  line: 'homme',
  family: 'Boisé cuiré',
  tag: 'Best-seller',
  short_description: 'Cuir noir, iris, cèdre.',
  from_price_cents: 45000,
  is_demo: true,
  image: { url: '/images/flacons/flacon-noir.webp', alt: 'Flacon Luphéra Noir' },
  variants_count: 3,
};

describe('ProductCard', () => {
  it('shows the product, its family and its from price', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Luphéra Noir' })).toBeInTheDocument();
    expect(screen.getByText('Boisé cuiré')).toBeInTheDocument();
    expect(screen.getByText('450 MAD')).toBeInTheDocument();
    expect(screen.getByText('À partir de')).toBeInTheDocument();
  });

  it('links the whole visual and the title to the product page', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link', { name: /Luphéra Noir/ });

    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/produit/luphera-noir');
    });
  });

  it('marks the line and the commercial tag', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Homme')).toBeInTheDocument();
    expect(screen.getByText('Best-seller')).toBeInTheDocument();
  });

  it('hides the from price label when there is a single size', () => {
    render(
      <MemoryRouter>
        <ProductCard product={{ ...product, variants_count: 1, line: 'coffret' }} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('À partir de')).not.toBeInTheDocument();
    expect(screen.getByText('Coffret')).toBeInTheDocument();
  });
});
