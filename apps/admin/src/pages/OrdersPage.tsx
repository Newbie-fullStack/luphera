import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Phone, Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { downloadOrdersCsv, fetchOrders } from '@/lib/api/admin';
import { formatDateTime, formatMAD, formatPhone } from '@/lib/format';

const STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
  'failed_delivery',
] as const;

export function OrdersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [city, setCity] = useState(params.get('city') ?? '');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');

  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? '1');

  const orders = useQuery({
    queryKey: ['orders', status, city, q, from, to, page],
    queryFn: () =>
      fetchOrders({ status, city, q, from, to, page }),
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

  const onSearch = (event: React.FormEvent): void => {
    event.preventDefault();
    update({ q, city, from, to });
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupPilotage')}
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void downloadOrdersCsv({ status, city, q, from, to });
            }}
          >
            <Download size={14} aria-hidden="true" />
            {t('orders.exportCsv')}
          </button>
        }
      />

      <form className="panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6" onSubmit={onSearch}>
        <div className="xl:col-span-2">
          <label className="field-label" htmlFor="order-q">
            {t('common.search')}
          </label>
          <input
            id="order-q"
            className="field-input"
            placeholder={t('orders.searchPlaceholder')}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="order-status">
            {t('orders.statusLabel')}
          </label>
          <select
            id="order-status"
            className="field-select"
            value={status}
            onChange={(event) => {
              update({ status: event.target.value });
            }}
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`orders.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="order-city">
            {t('common.city')}
          </label>
          <input
            id="order-city"
            className="field-input"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="order-from">
            {t('orders.from')}
          </label>
          <input
            id="order-from"
            type="date"
            className="field-input"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="order-to">
            {t('orders.to')}
          </label>
          <input
            id="order-to"
            type="date"
            className="field-input"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
            }}
          />
        </div>
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-6">
          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={14} aria-hidden="true" />
            {t('common.filter')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQ('');
              setCity('');
              setFrom('');
              setTo('');
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            {t('common.reset')}
          </button>
        </div>
      </form>

      <div className="panel">
        {orders.isLoading ? (
          <Spinner />
        ) : orders.isError || orders.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : orders.data.data.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('orders.number')}</th>
                    <th>{t('orders.customer')}</th>
                    <th>{t('common.city')}</th>
                    <th className="num">{t('orders.items')}</th>
                    <th className="num">{t('common.total')}</th>
                    <th>{t('orders.statusLabel')}</th>
                    <th>{t('common.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.data.map((order) => (
                    <tr key={order.number}>
                      <td>
                        <Link
                          to={`/commandes/${order.number}`}
                          className="font-medium whitespace-nowrap text-or-clair hover:underline"
                        >
                          {order.number}
                        </Link>
                        {order.needs_confirmation ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-[0.12em] text-or uppercase">
                            <Phone size={10} aria-hidden="true" />
                            {t('orders.needsConfirmation')}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <p className="text-ivoire">{order.customer.name}</p>
                        <p className="text-xs text-brume">{formatPhone(order.customer.phone)}</p>
                      </td>
                      <td>{order.city ?? '—'}</td>
                      <td className="num">{order.items_count}</td>
                      <td className="num">{formatMAD(order.total_cents)}</td>
                      <td>
                        <StatusBadge value={order.status} kind="order" />
                      </td>
                      <td className="whitespace-nowrap text-brume">
                        {formatDateTime(order.placed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={orders.data.meta}
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
