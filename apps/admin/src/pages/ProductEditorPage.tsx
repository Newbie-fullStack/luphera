import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import {
  addMedia,
  archiveProduct,
  createProduct,
  createVariant,
  deleteMedia,
  deleteVariant,
  fetchProduct,
  publishProduct,
  syncNotes,
  unpublishProduct,
  updateProduct,
  updateVariant,
} from '@/lib/api/admin';
import type { ProductDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatMAD } from '@/lib/format';

const LINES = ['homme', 'femme', 'coffret'] as const;
const LEVELS = ['top', 'heart', 'base'] as const;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  line: z.enum(LINES),
  family: z.string().trim().min(2).max(64),
  tag: z.string().trim().max(32),
  short_description: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20),
  intensity: z.string(),
  longevity: z.string(),
  sillage: z.string(),
  season: z.string().trim().max(64),
  occasion: z.string().trim().max(64),
  seo_title: z.string().trim().max(190),
  seo_description: z.string().trim().max(320),
});

type Values = z.infer<typeof schema>;

function scaleValue(value: string): number | null {
  return value === '' ? null : Number(value);
}

function scaleDefault(value: number | null): string {
  return value === null ? '' : String(value);
}

export function ProductEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isNew = id === undefined;

  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id ?? ''),
    enabled: !isNew,
  });

  if (isNew) {
    return <ProductEditor product={null} />;
  }

  if (product.isLoading) {
    return <Spinner />;
  }

  if (product.isError || product.data === undefined) {
    return <EmptyState title={t('common.empty')} />;
  }

  return <ProductEditor key={product.data.id} product={product.data} />;
}

function ProductEditor({ product }: { product: ProductDetail | null }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? '',
      line: product?.line ?? 'femme',
      family: product?.family ?? '',
      tag: product?.tag ?? '',
      short_description: product?.short_description ?? '',
      description: product?.description ?? '',
      intensity: scaleDefault(product?.intensity ?? null),
      longevity: scaleDefault(product?.longevity ?? null),
      sillage: scaleDefault(product?.sillage ?? null),
      season: product?.season ?? '',
      occasion: product?.occasion ?? '',
      seo_title: product?.seo.title ?? '',
      seo_description: product?.seo.description ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (values: Values) => {
      const payload = {
        name: values.name,
        line: values.line,
        family: values.family,
        tag: values.tag === '' ? null : values.tag,
        short_description: values.short_description,
        description: values.description,
        intensity: scaleValue(values.intensity),
        longevity: scaleValue(values.longevity),
        sillage: scaleValue(values.sillage),
        season: values.season === '' ? null : values.season,
        occasion: values.occasion === '' ? null : values.occasion,
        seo_title: values.seo_title === '' ? null : values.seo_title,
        seo_description: values.seo_description === '' ? null : values.seo_description,
      };

      return product === null ? createProduct(payload) : updateProduct(product.id, payload);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setFeedback(t('products.updated'));

      if (product === null) {
        void navigate(`/produits/${saved.id}`, { replace: true });
      }
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const publish = useMutation({
    mutationFn: (action: 'publish' | 'unpublish' | 'archive') => {
      const target = product?.id ?? '';

      if (action === 'publish') {
        return publishProduct(target);
      }

      return action === 'unpublish' ? unpublishProduct(target) : archiveProduct(target);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setFeedback(
        saved.status === 'archived' ? t('products.archivedNotice') : t('products.updated'),
      );
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFeedback(null);
    save.mutate(values);
  });

  return (
    <div className="grid gap-5">
      <Link
        to="/produits"
        className="flex items-center gap-2 text-xs text-brume hover:text-ivoire"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t('common.back')}
      </Link>

      <PageHeader
        eyebrow={t('nav.groupCatalogue')}
        title={product === null ? t('products.new') : product.name}
        subtitle={product === null ? undefined : `/${product.slug}`}
        actions={
          <>
            {product !== null ? <StatusBadge value={product.status} kind="product" /> : null}
            {product !== null && can('catalog.manage') ? (
              <>
                {product.status === 'active' ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={publish.isPending}
                    onClick={() => {
                      publish.mutate('unpublish');
                    }}
                  >
                    {t('common.unpublish')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={publish.isPending}
                    onClick={() => {
                      publish.mutate('publish');
                    }}
                  >
                    {t('common.publish')}
                  </button>
                )}
                {product.status !== 'archived' ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={publish.isPending}
                    onClick={() => {
                      if (window.confirm(t('products.archiveConfirm'))) {
                        publish.mutate('archive');
                      }
                    }}
                  >
                    {t('common.archive')}
                  </button>
                ) : null}
              </>
            ) : null}
          </>
        }
      />

      <form className="grid gap-4 xl:grid-cols-[1.4fr_1fr]" onSubmit={(event) => void onSubmit(event)} noValidate>
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('products.edit')}</h2>
          </div>
          <div className="panel-body grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="name">
                  {t('common.name')}
                </label>
                <input id="name" className="field-input" {...register('name')} />
                {errors.name !== undefined ? (
                  <p className="field-error">{t('common.required')}</p>
                ) : null}
              </div>
              <div>
                <label className="field-label" htmlFor="line">
                  {t('products.line')}
                </label>
                <select id="line" className="field-select" {...register('line')}>
                  {LINES.map((value) => (
                    <option key={value} value={value}>
                      {t(`products.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="family">
                  {t('products.family')}
                </label>
                <input id="family" className="field-input" {...register('family')} />
                {errors.family !== undefined ? (
                  <p className="field-error">{t('common.required')}</p>
                ) : null}
              </div>
              <div>
                <label className="field-label" htmlFor="tag">
                  {t('products.tag')}
                </label>
                <input id="tag" className="field-input" {...register('tag')} />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="short_description">
                {t('products.shortDescription')}
              </label>
              <input
                id="short_description"
                className="field-input"
                {...register('short_description')}
              />
              {errors.short_description !== undefined ? (
                <p className="field-error">{t('common.required')}</p>
              ) : null}
            </div>

            <div>
              <label className="field-label" htmlFor="description">
                {t('products.description')}
              </label>
              <textarea
                id="description"
                className="field-textarea"
                rows={7}
                {...register('description')}
              />
              {errors.description !== undefined ? (
                <p className="field-error">{t('common.required')}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['intensity', 'products.intensity'],
                  ['longevity', 'products.longevity'],
                  ['sillage', 'products.sillage'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="field-label" htmlFor={field}>
                    {t(label)}
                  </label>
                  <select id={field} className="field-select" {...register(field)}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} / 5
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="season">
                  {t('products.season')}
                </label>
                <input id="season" className="field-input" {...register('season')} />
              </div>
              <div>
                <label className="field-label" htmlFor="occasion">
                  {t('products.occasion')}
                </label>
                <input id="occasion" className="field-input" {...register('occasion')} />
              </div>
            </div>

            <div className="divider" />

            <div className="grid gap-4">
              <div>
                <label className="field-label" htmlFor="seo_title">
                  {t('products.seoTitle')}
                </label>
                <input id="seo_title" className="field-input" {...register('seo_title')} />
              </div>
              <div>
                <label className="field-label" htmlFor="seo_description">
                  {t('products.seoDescription')}
                </label>
                <textarea
                  id="seo_description"
                  className="field-textarea"
                  rows={2}
                  {...register('seo_description')}
                />
              </div>
            </div>

            {feedback !== null ? (
              <p className="text-xs text-brume" role="status">
                {feedback}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmitting || save.isPending || !can('catalog.manage')}
              >
                {save.isPending ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4">
          {product === null ? (
            <div className="panel">
              <div className="panel-body text-sm text-brume">{t('products.publishHint')}</div>
            </div>
          ) : (
            <>
              <VariantsPanel product={product} />
              <NotesPanel key={product.id} product={product} />
              <MediaPanel key={`media-${product.id}`} product={product} />
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function VariantsPanel({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [label, setLabel] = useState('');
  const [sizeMl, setSizeMl] = useState('50');
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [stock, setStock] = useState('0');
  const [threshold, setThreshold] = useState('5');
  const [isDefault, setIsDefault] = useState(false);

  const reset = (): void => {
    setEditing(null);
    setSku('');
    setLabel('');
    setSizeMl('50');
    setPrice('');
    setCompareAt('');
    setStock('0');
    setThreshold('5');
    setIsDefault(false);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        sku,
        label: label === '' ? null : label,
        size_ml: Number(sizeMl),
        price_cents: Number(price),
        compare_at_price_cents: compareAt === '' ? null : Number(compareAt),
        stock: Number(stock),
        low_stock_threshold: Number(threshold),
        is_default: isDefault,
      };

      return editing === null
        ? createVariant(product.id, payload)
        : updateVariant(editing, payload);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
    },
  });

  const remove = useMutation({
    mutationFn: (variantId: string) => deleteVariant(variantId),
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const startEdit = (variant: ProductDetail['variants'][number]): void => {
    setEditing(variant.id);
    setSku(variant.sku);
    setLabel(variant.label ?? '');
    setSizeMl(String(variant.size_ml));
    setPrice(String(variant.price_cents));
    setCompareAt(variant.compare_at_price_cents === null ? '' : String(variant.compare_at_price_cents));
    setStock(String(variant.stock));
    setThreshold(String(variant.low_stock_threshold));
    setIsDefault(variant.is_default);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{t('products.variants')}</h2>
        <span className="text-xs text-brume">{formatMAD(product.from_price_cents)}</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('products.sku')}</th>
              <th className="num">{t('products.price')}</th>
              <th className="num">{t('products.stock')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {product.variants.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-brume">
                  {t('products.noVariants')}
                </td>
              </tr>
            ) : (
              product.variants.map((variant) => (
                <tr key={variant.id}>
                  <td>
                    <p className="text-ivoire">{variant.sku}</p>
                    <p className="text-xs text-brume">
                      {variant.label ?? '—'} · {variant.size_ml} ml
                      {variant.is_default ? ` · ${t('products.default')}` : ''}
                    </p>
                  </td>
                  <td className="num">{formatMAD(variant.price_cents)}</td>
                  <td className="num">{variant.stock}</td>
                  <td className="actions">
                    {can('catalog.manage') ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            startEdit(variant);
                          }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm(t('products.deleteVariantConfirm'))) {
                              remove.mutate(variant.id);
                            }
                          }}
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {can('catalog.manage') ? (
        <div className="grid gap-3 border-t border-ligne p-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="variant-sku">
              {t('products.sku')}
            </label>
            <input
              id="variant-sku"
              className="field-input"
              value={sku}
              onChange={(event) => {
                setSku(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="variant-label">
              {t('products.label')}
            </label>
            <input
              id="variant-label"
              className="field-input"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="variant-size">
              {t('products.sizeMl')}
            </label>
            <input
              id="variant-size"
              type="number"
              min={1}
              className="field-input"
              value={sizeMl}
              onChange={(event) => {
                setSizeMl(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="variant-price">
              {t('products.price')}
            </label>
            <input
              id="variant-price"
              type="number"
              min={0}
              className="field-input"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="variant-compare">
              {t('products.compareAt')}
            </label>
            <input
              id="variant-compare"
              type="number"
              min={0}
              className="field-input"
              value={compareAt}
              onChange={(event) => {
                setCompareAt(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="variant-stock">
              {t('products.stock')}
            </label>
            <input
              id="variant-stock"
              type="number"
              min={0}
              className="field-input"
              value={stock}
              onChange={(event) => {
                setStock(event.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="variant-threshold">
              {t('products.threshold')}
            </label>
            <input
              id="variant-threshold"
              type="number"
              min={0}
              className="field-input"
              value={threshold}
              onChange={(event) => {
                setThreshold(event.target.value);
              }}
            />
          </div>
          <label className="checkbox self-end pb-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => {
                setIsDefault(event.target.checked);
              }}
            />
            {t('products.default')}
          </label>
          <p className="field-hint sm:col-span-2">{t('products.priceHint')}</p>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={save.isPending || sku === '' || price === ''}
              onClick={() => {
                save.mutate();
              }}
            >
              <Plus size={13} aria-hidden="true" />
              {editing === null ? t('products.addVariant') : t('common.save')}
            </button>
            {editing !== null ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                {t('common.cancel')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotesPanel({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { control, register, getValues } = useForm<{
    notes: Array<{ level: 'top' | 'heart' | 'base'; name: string }>;
  }>({
    defaultValues: { notes: product.notes },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'notes' });

  const save = useMutation({
    mutationFn: () =>
      syncNotes(
        product.id,
        getValues('notes').filter((note) => note.name.trim() !== ''),
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
    },
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{t('products.notes')}</h2>
        {can('catalog.manage') ? (
          <button
            type="button"
            className="text-[10px] tracking-[0.16em] text-or uppercase"
            onClick={() => {
              append({ level: 'top', name: '' });
            }}
          >
            {t('products.addNote')}
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 p-4">
        {fields.length === 0 ? (
          <p className="text-sm text-brume">{t('common.none')}</p>
        ) : (
          fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[110px_1fr_auto] gap-2">
              <select
                className="field-select"
                aria-label={t('products.notes')}
                disabled={!can('catalog.manage')}
                {...register(`notes.${index}.level`)}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`products.${level}`)}
                  </option>
                ))}
              </select>
              <input
                className="field-input"
                aria-label={t('products.addNote')}
                disabled={!can('catalog.manage')}
                {...register(`notes.${index}.name`)}
              />
              {can('catalog.manage') ? (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    remove(index);
                  }}
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
        {can('catalog.manage') ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm justify-self-start"
            disabled={save.isPending}
            onClick={() => {
              save.mutate();
            }}
          >
            {t('common.save')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MediaPanel({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');

  const add = useMutation({
    mutationFn: () => addMedia(product.id, { url, alt }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
      setUrl('');
      setAlt('');
    },
  });

  const remove = useMutation({
    mutationFn: (mediaId: number) => deleteMedia(mediaId),
    onSuccess: (saved) => {
      queryClient.setQueryData(['product', saved.id], saved);
    },
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{t('products.media')}</h2>
      </div>
      <div className="grid gap-2 p-4">
        {product.media.length === 0 ? (
          <p className="text-sm text-brume">{t('common.none')}</p>
        ) : (
          product.media.map((media) => (
            <div
              key={media.id}
              className="flex items-center justify-between gap-3 border border-ligne px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-ivoire">{media.url}</p>
                <p className="truncate text-[11px] text-brume">{media.alt}</p>
              </div>
              {can('catalog.manage') ? (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (window.confirm(t('products.deleteMediaConfirm'))) {
                      remove.mutate(media.id);
                    }
                  }}
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))
        )}

        {can('catalog.manage') ? (
          <>
            <div>
              <label className="field-label" htmlFor="media-url">
                {t('products.mediaUrl')}
              </label>
              <input
                id="media-url"
                className="field-input"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="media-alt">
                {t('products.mediaAlt')}
              </label>
              <input
                id="media-alt"
                className="field-input"
                value={alt}
                onChange={(event) => {
                  setAlt(event.target.value);
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm justify-self-start"
              disabled={add.isPending || url === '' || alt === ''}
              onClick={() => {
                add.mutate();
              }}
            >
              <Plus size={13} aria-hidden="true" />
              {t('products.addMedia')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
