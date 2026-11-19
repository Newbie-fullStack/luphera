import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import { fetchProducts } from '@/lib/api/admin';
import { formatMAD } from '@/lib/format';

const LINES = ['homme', 'femme', 'coffret'] as const;
const STATUSES = ['draft', 'active', 'archived'] as const;

export function ProductsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const status = params.get('status') ?? '';
  const line = params.get('line') ?? '';
  const page = Number(params.get('page') ?? '1');

  const products = useQuery({
    queryKey: ['products', q, status, line, page],
    queryFn: () => fetchProducts({ q, status, line, page }),
  });

  const update = (patch: Record<string, string>): void => {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(patch)) {
      if (value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    if (!('page' in patch)) {
      next.delete('page');
    }

    setParams(next, { replace: true });
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupCatalogue')}
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          can('catalog.manage') ? (
            <Link to="/produits/nouveau" className="btn btn-primary btn-sm">
              <Plus size={14} aria-hidden="true" />
              {t('products.new')}
            </Link>
          ) : undefined
        }
      />

      <form
        className="panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q });
        }}
      >
        <div className="xl:col-span-2">
          <label className="field-label" htmlFor="product-q">
            {t('common.search')}
          </label>
          <input
            id="product-q"
            className="field-input"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="product-line">
            {t('products.line')}
          </label>
          <select
            id="product-line"
            className="field-select"
            value={line}
            onChange={(event) => {
              update({ line: event.target.value });
            }}
          >
            <option value="">{t('common.all')}</option>
            {LINES.map((value) => (
              <option key={value} value={value}>
                {t(`products.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="product-status">
            {t('common.status')}
          </label>
          <select
            id="product-status"
            className="field-select"
            value={status}
            onChange={(event) => {
              update({ status: event.target.value });
            }}
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`products.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={14} aria-hidden="true" />
            {t('common.filter')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQ('');
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            {t('common.reset')}
          </button>
        </div>
      </form>

      <div className="panel">
        {products.isLoading ? (
          <Spinner />
        ) : products.isError || products.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : products.data.data.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('products.title')}</th>
                    <th>{t('products.line')}</th>
                    <th>{t('products.family')}</th>
                    <th className="num">{t('products.variants')}</th>
                    <th className="num">{t('products.stockTotal')}</th>
                    <th className="num">{t('products.fromPrice')}</th>
                    <th>{t('common.status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.data.data.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link
                          to={`/produits/${product.id}`}
                          className="text-ivoire hover:text-or-clair"
                        >
                          {product.name}
                        </Link>
                        <p className="font-mono text-[11px] text-brume">{product.slug}</p>
                      </td>
                      <td>{t(`products.${product.line}`)}</td>
                      <td className="text-brume">{product.family}</td>
                      <td className="num">{product.variants_count}</td>
                      <td className="num">{product.stock_total}</td>
                      <td className="num">{formatMAD(product.from_price_cents)}</td>
                      <td>
                        <StatusBadge value={product.status} kind="product" />
                      </td>
                      <td className="actions">
                        <Link to={`/produits/${product.id}`} className="btn btn-ghost btn-sm">
                          {can('catalog.manage') ? t('common.edit') : t('common.close')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={products.data.meta}
              onChange={(next) => {
                update({ page: String(next) });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
