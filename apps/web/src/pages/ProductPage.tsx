import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { Meter } from '@/components/ui/Meter';
import { SizeSelector } from '@/components/ui/SizeSelector';
import { Stepper } from '@/components/ui/Stepper';
import { Tag } from '@/components/ui/Tag';
import { addToWishlist, fetchWishlist, removeFromWishlist } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ProductJsonLd } from '@/features/catalog/components/ProductJsonLd';
import { useProduct, useRelatedProducts } from '@/features/catalog/useCatalog';
import type { ProductDetail, ProductSummary } from '@/features/catalog/types';
import { useCart } from '@/features/cart/useCart';
import { ReviewsSection } from '@/features/reviews/ReviewsSection';
import { ApiError } from '@/lib/api/client';
import { formatMAD } from '@/lib/format';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { data: product, error, isPending, refetch } = useProduct(slug);
  const { data: related } = useRelatedProducts(slug);

  useEffect(() => {
    if (product) {
      document.title = product.seo.title ?? `${product.name} — Luphéra`;
    }
  }, [product]);

  if (error instanceof ApiError && error.status === 404) {
    return <ProductNotFound />;
  }

  if (error) {
    return (
      <div className="gutter grid min-h-[60vh] place-items-center py-24">
        <div className="grid justify-items-center gap-4 text-center">
          <p className="font-display text-2xl text-ivoire">{t('product.error')}</p>
          <p className="text-sm text-brume">{t('product.errorHint')}</p>
          <button type="button" className="btn btn-secondary mt-2" onClick={() => void refetch()}>
            {t('product.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (isPending || !product) {
    return (
      <div className="gutter grid min-h-[60vh] place-items-center py-24">
        <p role="status" className="text-[11px] uppercase tracking-[.3em] text-brume">
          {t('product.loading')}
        </p>
      </div>
    );
  }

  return <ProductView key={product.id} product={product} related={related ?? []} />;
}

interface ProductViewProps {
  product: ProductDetail;
  related: ProductSummary[];
}

function ProductView({ product, related }: ProductViewProps) {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  const wishlist = useQuery({
    queryKey: ['wishlist'],
    queryFn: fetchWishlist,
    enabled: user !== null,
    staleTime: 60_000,
  });
  const isFavourite = wishlist.data?.some((item) => item.id === product.id) ?? false;

  const toggleWishlist = useMutation({
    mutationFn: () =>
      isFavourite ? removeFromWishlist(product.id) : addToWishlist(product.id),
    onSuccess: () => {
      setWishlistError(null);
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => setWishlistError(t('product.wishlistError')),
  });

  const handleWishlist = () => {
    if (user === null) {
      void navigate(
        `/connexion?redirect=${encodeURIComponent(`/produit/${product.slug}`)}`,
      );
      return;
    }

    toggleWishlist.mutate();
  };

  const variants = product.variants;
  const selected =
    variants.find((variant) => variant.id === variantId) ??
    variants.find((variant) => variant.is_default) ??
    variants[0];

  const photos = product.media.filter((media) => media.type === 'photo');
  const activePhoto = photos[mediaIndex] ?? photos[0] ?? null;
  const price = selected?.price_cents ?? product.from_price_cents;
  const compareAt = selected?.compare_at_price_cents ?? null;
  const available = selected !== undefined && selected.stock_status !== 'out_of_stock';

  const noteGroups = (['top', 'heart', 'base'] as const).map((level) => ({
    level,
    values: product.notes[level],
  }));
  const hasNotes = noteGroups.some((group) => group.values.length > 0);
  const hasMeters =
    product.intensity !== null || product.longevity !== null || product.sillage !== null;

  const addToCartLabel = adding
    ? t('product.addToCartPending')
    : available
      ? t('product.addToCart')
      : t('product.addToCartUnavailable');

  async function handleAdd(): Promise<void> {
    if (selected === undefined || adding || !available) {
      return;
    }

    setAdding(true);
    setCartError(null);

    try {
      await addItem(selected.id, quantity);
    } catch (error) {
      setCartError(error instanceof ApiError ? error.message : t('product.addToCartError'));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="gutter pb-32 pt-10 lg:pb-24">
      <Breadcrumbs
        items={[
          { label: t('product.breadcrumbHome'), to: '/' },
          { label: t('product.breadcrumbShop'), to: '/boutique' },
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <section aria-label={t('product.gallery')} className="grid content-start gap-4">
          <div className="product-media" data-line={product.line}>
            <span aria-hidden="true" className="product-media-glow" />
            {activePhoto ? (
              <img
                src={activePhoto.url}
                alt={activePhoto.alt}
                width={305}
                height={1000}
                fetchPriority="high"
                decoding="async"
                className="product-media-bottle"
              />
            ) : null}
            <span className="product-media-line" aria-hidden="true" />
          </div>

          {photos.length > 1 ? (
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <button
                  key={`${photo.url}-${index}`}
                  type="button"
                  aria-label={t('product.galleryThumb', { index: index + 1 })}
                  aria-pressed={index === mediaIndex}
                  className="product-thumb"
                  onClick={() => setMediaIndex(index)}
                >
                  <img src={photo.url} alt="" loading="lazy" decoding="async" width={61} height={200} />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid content-start gap-7">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={product.line === 'femme' ? 'rose' : 'gold'}>
                {t(`shop.lines.${product.line}`)}
              </Tag>
              {product.tag ? <Tag>{product.tag}</Tag> : null}
            </div>

            <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.04]">{product.name}</h1>
            <p className="text-[11px] uppercase tracking-[.28em] text-brume">{product.family}</p>
            <p className="max-w-[56ch] text-[17px] leading-relaxed text-texte">
              {product.short_description}
            </p>
          </div>

          <div className="grid gap-2 border-y border-ligne py-6">
            <p className="flex flex-wrap items-baseline gap-3 text-ivoire">
              <span className="font-display text-[clamp(1.7rem,3vw,2.3rem)] tracking-wide">
                {formatMAD(price)}
              </span>
              {compareAt && compareAt > price ? (
                <s className="text-sm text-brume">{formatMAD(compareAt)}</s>
              ) : null}
            </p>
            <p className="text-[11px] uppercase tracking-[.24em] text-brume">
              {selected ? t(`product.stock.${selected.stock_status}`) : null}
            </p>
          </div>

          <div className="grid gap-6">
            {variants.length > 1 ? (
              <div className="grid gap-3">
                <span className="field-label">{t('product.sizeLabel')}</span>
                <SizeSelector
                  label={t('product.sizeLabel')}
                  value={selected?.id ?? ''}
                  options={variants.map((variant) => ({
                    id: variant.id,
                    ml: variant.size_ml,
                    label: variant.label,
                    priceCents: variant.price_cents,
                    available: variant.stock_status !== 'out_of_stock',
                  }))}
                  onChange={setVariantId}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-2">
                <span className="field-label">{t('product.quantity')}</span>
                <Stepper
                  value={quantity}
                  onChange={setQuantity}
                  max={10}
                  decreaseLabel={t('product.decrease')}
                  increaseLabel={t('product.increase')}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={adding || !available}
                aria-describedby="cart-next-step"
                onClick={() => void handleAdd()}
              >
                {addToCartLabel}
              </button>
            </div>

            {cartError !== null ? (
              <p role="alert" className="field-error">
                {cartError}
              </p>
            ) : null}

            <p id="cart-next-step" className="text-[12.5px] leading-relaxed text-brume">
              {t('product.cartNextStep')}
            </p>

            <button
              type="button"
              onClick={handleWishlist}
              aria-pressed={isFavourite}
              disabled={toggleWishlist.isPending}
              className="inline-flex items-center gap-2 justify-self-start text-[10.5px] uppercase tracking-[.24em] text-brume transition-colors hover:text-or-clair disabled:opacity-50"
            >
              <Heart size={14} aria-hidden="true" fill={isFavourite ? 'currentColor' : 'none'} />
              {isFavourite ? t('account.wishlist.remove') : t('product.wishlistAdd')}
            </button>

            {wishlistError !== null ? (
              <p role="alert" className="field-error">
                {wishlistError}
              </p>
            ) : null}
          </div>

          {hasMeters ? (
            <div className="grid gap-4 border-t border-ligne pt-6 sm:grid-cols-3">
              {product.intensity !== null ? (
                <Meter label={t('product.meters.intensity')} value={product.intensity} />
              ) : null}
              {product.longevity !== null ? (
                <Meter label={t('product.meters.longevity')} value={product.longevity} />
              ) : null}
              {product.sillage !== null ? (
                <Meter label={t('product.meters.sillage')} value={product.sillage} />
              ) : null}
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-4 border-t border-ligne pt-6 text-sm">
            {product.season ? (
              <div className="grid gap-1">
                <dt className="text-[10.5px] uppercase tracking-[.24em] text-brume">
                  {t('product.facts.season')}
                </dt>
                <dd className="text-texte">{product.season}</dd>
              </div>
            ) : null}
            {product.occasion ? (
              <div className="grid gap-1">
                <dt className="text-[10.5px] uppercase tracking-[.24em] text-brume">
                  {t('product.facts.occasion')}
                </dt>
                <dd className="text-texte">{product.occasion}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {hasNotes ? (
        <section className="mt-20 border-t border-ligne pt-12">
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)]">{t('product.notesTitle')}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {noteGroups.map((group) => (
              <div key={group.level} className="grid content-start gap-3 border border-ligne p-6">
                <h3 className="text-[11px] uppercase tracking-[.28em] text-or-clair">
                  {t(`product.notes.${group.level}`)}
                </h3>
                <ul className="grid gap-2 text-[15px] leading-relaxed text-texte">
                  {group.values.map((note) => (
                    <li key={note} className="border-b border-ligne/60 pb-2 last:border-0 last:pb-0">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {product.bundle ? (
        <section className="mt-16 border border-ligne bg-obsidienne p-6 md:p-8">
          <h2 className="text-[clamp(1.4rem,2.6vw,1.9rem)]">{t('product.bundleTitle')}</h2>
          <ul className="mt-5 grid gap-3 text-[15px] text-texte">
            {product.bundle.items.map((item, index) => (
              <li
                key={`${item.label}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ligne/60 pb-3 last:border-0 last:pb-0"
              >
                <span>{item.label}</span>
                {item.quantity > 1 ? (
                  <span className="text-[11px] uppercase tracking-[.24em] text-brume">
                    {t('product.bundleQuantity', { count: item.quantity })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-16 border-t border-ligne pt-8" aria-label={t('product.detailsTitle')}>
        <h2 className="sr-only">{t('product.detailsTitle')}</h2>
        <div className="grid gap-0">
          <details className="product-detail group" open>
            <summary>
              {t('product.accordions.description')}
              <ChevronDown size={16} aria-hidden="true" className="product-detail-icon" />
            </summary>
            <p className="pb-6 text-[15px] leading-relaxed text-texte">{product.description}</p>
          </details>

          <details className="product-detail group">
            <summary>
              {t('product.accordions.usage')}
              <ChevronDown size={16} aria-hidden="true" className="product-detail-icon" />
            </summary>
            <p className="pb-6 text-[15px] leading-relaxed text-texte">{t('product.usage')}</p>
          </details>

          <details className="product-detail group">
            <summary>
              {t('product.accordions.composition')}
              <ChevronDown size={16} aria-hidden="true" className="product-detail-icon" />
            </summary>
            <p className="pb-6 text-[15px] leading-relaxed text-texte">
              {t('product.compositionPending')}
            </p>
          </details>

          <details className="product-detail group">
            <summary>
              {t('product.accordions.shipping')}
              <ChevronDown size={16} aria-hidden="true" className="product-detail-icon" />
            </summary>
            <p className="pb-6 text-[15px] leading-relaxed text-texte">{t('product.shipping')}</p>
          </details>
        </div>
      </section>

      {product.is_demo ? (
        <p className="mt-8 text-[11px] leading-relaxed text-brume/80">{t('product.demoNotice')}</p>
      ) : null}

      <ReviewsSection productId={product.id} slug={product.slug} />

      {related.length > 0 ? (
        <section className="mt-20 border-t border-ligne pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3">
              <p className="eyebrow">{t('product.relatedTitle')}</p>
              <h2 className="text-[clamp(1.6rem,3vw,2.2rem)]">{t('product.relatedLead')}</h2>
            </div>
            <Link to="/boutique" className="lnk">
              <ArrowLeft size={14} aria-hidden="true" />
              {t('product.breadcrumbShop')}
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <ProductJsonLd product={product} />

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-ligne bg-nuit/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="grid gap-0.5">
          <span className="text-[10px] uppercase tracking-[.24em] text-brume">
            {selected?.label ?? product.family}
          </span>
          <span className="font-display text-lg text-ivoire">{formatMAD(price)}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary min-h-11 flex-1"
          disabled={adding || !available}
          onClick={() => void handleAdd()}
        >
          {addToCartLabel}
        </button>
      </div>
    </div>
  );
}

function ProductNotFound() {
  const { t } = useTranslation();

  return (
    <div className="gutter grid min-h-[60vh] place-items-center py-24">
      <div className="grid max-w-lg justify-items-center gap-5 text-center">
        <p className="eyebrow">404</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)]">{t('product.notFoundTitle')}</h1>
        <p className="text-[15px] leading-relaxed text-texte">{t('product.notFoundBody')}</p>
        <ButtonLink to="/boutique" variant="secondary" className="mt-2">
          {t('product.notFoundBack')}
        </ButtonLink>
      </div>
    </div>
  );
}


