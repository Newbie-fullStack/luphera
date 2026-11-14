import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';

import { PRICE_RANGES, priceRangeKey } from '../priceRanges';
import type { CatalogFacets, ProductLine, ProductSort } from '../types';

const LINES: ProductLine[] = ['homme', 'femme', 'coffret'];

interface ShopFiltersProps {
  facets: CatalogFacets | undefined;
  line?: ProductLine;
  family?: string;
  notes: string[];
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSort;
  activeCount: number;
  onLine: (line?: ProductLine) => void;
  onFamily: (family?: string) => void;
  onNotes: (notes: string[]) => void;
  onPrice: (min?: number, max?: number) => void;
  onSort: (sort: ProductSort) => void;
  onReset: () => void;
}

export function ShopFilters({
  facets,
  line,
  family,
  notes,
  minPrice,
  maxPrice,
  sort,
  activeCount,
  onLine,
  onFamily,
  onNotes,
  onPrice,
  onSort,
  onReset,
}: ShopFiltersProps) {
  const { t } = useTranslation();
  const rangeKey = priceRangeKey(minPrice, maxPrice);

  const toggleNote = (note: string) => {
    onNotes(notes.includes(note) ? notes.filter((item) => item !== note) : [...notes, note]);
  };

  return (
    <section aria-label={t('shop.filters')} className="grid gap-5 border-y border-ligne py-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="sr-only">{t('shop.lineLabel')}</span>
        <Chip pressed={line === undefined} onPressedChange={() => onLine(undefined)}>
          {t('shop.all')}
        </Chip>
        {LINES.map((item) => (
          <Chip
            key={item}
            pressed={line === item}
            onPressedChange={() => onLine(line === item ? undefined : item)}
          >
            {t(`shop.lines.${item}`)}
          </Chip>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-2">
          <span className="field-label">{t('shop.familyLabel')}</span>
          <select
            className="field-input"
            value={family ?? ''}
            onChange={(event) => onFamily(event.target.value || undefined)}
          >
            <option value="">{t('shop.allFamilies')}</option>
            {facets?.families.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="field-label">{t('shop.priceLabel')}</span>
          <select
            className="field-input"
            value={rangeKey}
            onChange={(event) => {
              const range = PRICE_RANGES.find((item) => item.key === event.target.value);
              onPrice(range?.min, range?.max);
            }}
          >
            {PRICE_RANGES.map((range) => (
              <option key={range.key} value={range.key}>
                {t(range.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="field-label">{t('shop.sortLabel')}</span>
          <select
            className="field-input"
            value={sort}
            onChange={(event) => onSort(event.target.value as ProductSort)}
          >
            <option value="pertinence">{t('shop.sort.pertinence')}</option>
            <option value="prix-asc">{t('shop.sort.prixAsc')}</option>
            <option value="prix-desc">{t('shop.sort.prixDesc')}</option>
            <option value="nouveau">{t('shop.sort.nouveau')}</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            className="lnk disabled:pointer-events-none disabled:opacity-40"
            disabled={activeCount === 0}
            onClick={onReset}
          >
            {t('shop.reset')}
          </button>
        </div>
      </div>

      {facets && facets.notes.length > 0 ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] uppercase tracking-[.26em] text-brume transition-colors hover:text-or-clair">
            {t('shop.notesLabel')}
            {notes.length > 0 ? <span className="text-or-clair">({notes.length})</span> : null}
            <span aria-hidden="true" className="transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-2">
            {facets.notes.map((note) => (
              <Chip
                key={note}
                pressed={notes.includes(note)}
                onPressedChange={() => toggleNote(note)}
              >
                {note}
              </Chip>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
