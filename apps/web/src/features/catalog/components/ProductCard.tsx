import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useRef, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Tag } from '@/components/ui/Tag';
import { formatMAD } from '@/lib/format';

import type { ProductSummary } from '../types';

interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const tilt = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduceMotion || event.pointerType === 'touch') {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const node = tilt.current;

    if (!node) {
      return;
    }

    node.classList.add('is-live');
    node.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
    node.style.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
    node.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    node.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  const handlePointerLeave = () => {
    const node = tilt.current;

    if (!node) {
      return;
    }

    node.classList.remove('is-live');
    node.style.setProperty('--rx', '0deg');
    node.style.setProperty('--ry', '0deg');
  };

  const hasMultipleSizes = (product.variants_count ?? 0) > 1;

  return (
    <article className="product-card" data-line={product.line}>
      <Link
        to={`/produit/${product.slug}`}
        aria-label={t('shop.viewProduct', { name: product.name })}
        className="product-shot"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <span className="product-badges">
          <Tag tone={product.line === 'femme' ? 'rose' : 'gold'}>
            {t(`shop.lines.${product.line}`)}
          </Tag>
          {product.tag ? <Tag>{product.tag}</Tag> : null}
        </span>

        <div ref={tilt} className="product-tilt">
          {product.image ? (
            <img
              src={product.image.url}
              alt={product.image.alt}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              width={305}
              height={1000}
              className="product-bottle"
            />
          ) : null}
        </div>

        <span aria-hidden="true" className="product-glare" />
      </Link>

      <div className="grid content-start gap-3 border-t border-ligne p-5">
        <span className="text-[10.5px] uppercase tracking-[.28em] text-brume">
          {product.family}
        </span>
        <h3 className="text-[clamp(1.3rem,2vw,1.6rem)] leading-tight">
          <Link to={`/produit/${product.slug}`} className="transition-colors hover:text-or-clair">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-brume">
          {product.short_description}
        </p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <p className="grid gap-1 text-ivoire">
            {hasMultipleSizes ? (
              <span className="text-[10px] uppercase tracking-[.24em] text-brume">
                {t('shop.fromPrice')}
              </span>
            ) : null}
            <span className="font-display text-[1.15rem] tracking-wide">
              {formatMAD(product.from_price_cents)}
            </span>
          </p>
          <Link
            to={`/produit/${product.slug}`}
            className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[.26em] text-or-clair transition-colors hover:text-ivoire"
          >
            {t('shop.view')}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
