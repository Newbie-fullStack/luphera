import type { ProductDetail } from '../types';

export function ProductJsonLd({ product }: { product: ProductDetail }) {
  const prices = product.variants.map((variant) => variant.price_cents / 100);
  const available = product.variants.some((variant) => variant.stock_status !== 'out_of_stock');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image ? new URL(product.image.url, origin).href : undefined,
    brand: { '@type': 'Brand', name: 'Luphéra' },
    category: product.line === 'coffret' ? 'Coffret parfum' : 'Eau de parfum',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'MAD',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: product.variants.length,
      availability: available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
