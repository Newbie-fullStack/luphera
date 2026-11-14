import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/components/ui/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { ShopFilters } from '@/features/catalog/components/ShopFilters';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { useProducts } from '@/features/catalog/useCatalog';
import type { ProductLine, ProductSort } from '@/features/catalog/types';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const LINES: ProductLine[] = ['homme', 'femme', 'coffret'];
const SORTS: ProductSort[] = ['pertinence', 'prix-asc', 'prix-desc', 'nouveau'];

function parseLine(value: string | null): ProductLine | undefined {
  return LINES.find((line) => line === value);
}

function parseSort(value: string | null): ProductSort {
  return SORTS.find((sort) => sort === value) ?? 'pertinence';
}

function parsePrice(value: string | null): number | undefined {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
}

export function ShopPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const line = parseLine(params.get('ligne'));
  const family = params.get('famille') ?? undefined;
  const notes = params.getAll('note');
  const minPrice = parsePrice(params.get('prix_min'));
  const maxPrice = parsePrice(params.get('prix_max'));
  const q = params.get('q') ?? '';
  const sort = parseSort(params.get('tri'));
  const cursor = params.get('cursor') ?? undefined;

  const [term, setTerm] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const qRef = useRef(q);

  if (q !== lastQ) {
    setLastQ(q);
    setTerm(q);
  }

  const debouncedTerm = useDebouncedValue(term.trim(), 350);

  const patch = useCallback(
    (values: Record<string, string | undefined>, resetCursor = true) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          Object.entries(values).forEach(([key, value]) => {
            if (value === undefined || value === '') {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          });

          if (resetCursor) {
            next.delete('cursor');
          }

          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const patchRef = useRef(patch);

  useEffect(() => {
    patchRef.current = patch;
  }, [patch]);

  useEffect(() => {
    qRef.current = q;
  }, [q]);

  useEffect(() => {
    if (debouncedTerm === qRef.current) {
      return;
    }

    patchRef.current({ q: debouncedTerm }, true);
  }, [debouncedTerm]);

  const query = useMemo(
    () => ({
      line,
      family,
      notes: notes.length > 0 ? notes : undefined,
      min_price: minPrice,
      max_price: maxPrice,
      q: q === '' ? undefined : q,
      sort,
      per_page: 12,
      cursor,
    }),
    [line, family, notes, minPrice, maxPrice, q, sort, cursor],
  );

  const { data, error, isPending, isFetching, refetch } = useProducts(query);

  const items = data?.items ?? [];
  const meta = data?.meta;
  const activeCount =
    (line ? 1 : 0) +
    (family ? 1 : 0) +
    notes.length +
    (minPrice !== undefined ? 1 : 0) +
    (maxPrice !== undefined ? 1 : 0) +
    (q ? 1 : 0);

  const setNotes = (next: string[]) => {
    setParams(
      (previous) => {
        const paramsCopy = new URLSearchParams(previous);

        paramsCopy.delete('note');
        next.forEach((note) => paramsCopy.append('note', note));
        paramsCopy.delete('cursor');

        return paramsCopy;
      },
      { replace: true },
    );
  };

  const reset = () => {
    setTerm('');
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="gutter pb-24 pt-10">
      <PageHeader eyebrow={t('shop.eyebrow')} title={t('shop.title')} lead={t('shop.lead')} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <label className="relative flex w-full max-w-md items-center">
          <span className="sr-only">{t('shop.searchLabel')}</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 text-brume"
          />
          <input
            type="search"
            className="field-input pl-11"
            value={term}
            placeholder={t('shop.searchPlaceholder')}
            onChange={(event) => setTerm(event.target.value)}
          />
        </label>

        <p className="text-[11px] uppercase tracking-[.26em] text-brume" aria-live="polite">
          {meta ? t('shop.results', { count: meta.total }) : t('common.loading')}
        </p>
      </div>

      <ShopFilters
        facets={meta?.facets}
        line={line}
        family={family}
        notes={notes}
        minPrice={minPrice}
        maxPrice={maxPrice}
        sort={sort}
        activeCount={activeCount}
        onLine={(value) => patch({ ligne: value })}
        onFamily={(value) => patch({ famille: value })}
        onNotes={setNotes}
        onPrice={(min, max) =>
          patch({
            prix_min: min === undefined ? undefined : String(min),
            prix_max: max === undefined ? undefined : String(max),
          })
        }
        onSort={(value) => patch({ tri: value === 'pertinence' ? undefined : value })}
        onReset={reset}
      />

      {error ? (
        <div className="mt-16 grid justify-items-center gap-4 border border-ligne bg-obsidienne px-6 py-16 text-center">
          <p className="font-display text-2xl text-ivoire">{t('shop.error')}</p>
          <p className="text-sm text-brume">{t('shop.errorHint')}</p>
          <button type="button" className="btn btn-secondary mt-2" onClick={() => void refetch()}>
            {t('shop.retry')}
          </button>
        </div>
      ) : null}

      {!error && isPending ? (
        <p role="status" className="py-24 text-center text-[11px] uppercase tracking-[.3em] text-brume">
          {t('shop.loading')}
        </p>
      ) : null}

      {!error && !isPending && items.length === 0 ? (
        <div className="mt-16 grid justify-items-center gap-4 border border-ligne bg-obsidienne px-6 py-16 text-center">
          <p className="font-display text-2xl text-ivoire">{t('shop.emptyTitle')}</p>
          <p className="text-sm text-brume">{t('shop.emptyHint')}</p>
          <button type="button" className="lnk mt-2" onClick={reset}>
            {t('shop.emptyReset')}
          </button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <Reveal
            className={`mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
              isFetching ? 'opacity-60 transition-opacity duration-300' : ''
            }`}
          >
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 3} />
            ))}
          </Reveal>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ligne pt-6">
            <button
              type="button"
              className="lnk disabled:pointer-events-none disabled:opacity-30"
              disabled={!meta?.prev_cursor}
              onClick={() => patch({ cursor: meta?.prev_cursor ?? undefined }, false)}
            >
              {t('shop.previous')}
            </button>

            <p className="text-[10.5px] uppercase tracking-[.26em] text-brume">
              {t('shop.results', { count: meta?.total ?? items.length })}
            </p>

            <button
              type="button"
              className="lnk disabled:pointer-events-none disabled:opacity-30"
              disabled={!meta?.next_cursor}
              onClick={() => patch({ cursor: meta?.next_cursor ?? undefined }, false)}
            >
              {t('shop.next')}
            </button>
          </div>

          {items.some((product) => product.is_demo) ? (
            <p className="mt-8 text-center text-[11px] leading-relaxed text-brume/80">
              {t('shop.demoNotice')}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
