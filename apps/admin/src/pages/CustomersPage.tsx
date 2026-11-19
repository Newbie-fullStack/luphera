import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { fetchCustomers } from '@/lib/api/admin';
import { formatDate, formatMAD, formatPhone } from '@/lib/format';

export function CustomersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const active = params.get('active');
  const page = Number(params.get('page') ?? '1');

  const customers = useQuery({
    queryKey: ['customers', q, active, page],
    queryFn: () =>
      fetchCustomers({
        q,
        active: active === null ? undefined : active === '1',
        page,
      }),
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
        eyebrow={t('nav.groupRelation')}
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
      />

      <form
        className="panel flex flex-wrap items-end gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q });
        }}
      >
        <div className="min-w-56 flex-1">
          <label className="field-label" htmlFor="customer-q">
            {t('common.search')}
          </label>
          <input
            id="customer-q"
            className="field-input"
            placeholder={t('common.name')}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="customer-active">
            {t('common.status')}
          </label>
          <select
            id="customer-active"
            className="field-select"
            value={active ?? ''}
            onChange={(event) => {
              update({ active: event.target.value });
            }}
          >
            <option value="">{t('common.all')}</option>
            <option value="1">{t('customers.active')}</option>
            <option value="0">{t('customers.inactiveAccount')}</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          <Search size={14} aria-hidden="true" />
          {t('common.filter')}
        </button>
      </form>

      <div className="panel">
        {customers.isLoading ? (
          <Spinner />
        ) : customers.isError || customers.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : customers.data.data.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('common.phone')}</th>
                    <th className="num">{t('customers.orders')}</th>
                    <th className="num">{t('customers.spent')}</th>
                    <th>{t('customers.lastOrder')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.data.data.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link
                          to={`/clients/${customer.id}`}
                          className="text-ivoire hover:text-or-clair"
                        >
                          {customer.name}
                        </Link>
                        <p className="text-xs text-brume">
                          {customer.email ?? t('customers.since') + ' ' + formatDate(customer.created_at)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap">{formatPhone(customer.phone)}</td>
                      <td className="num">{customer.orders_count}</td>
                      <td className="num">{formatMAD(customer.spent_cents)}</td>
                      <td className="whitespace-nowrap text-brume">
                        {formatDate(customer.last_order_at)}
                      </td>
                      <td>
                        <span
                          className={
                            customer.is_active ? 'badge badge-ok' : 'badge badge-muted'
                          }
                        >
                          {customer.is_active
                            ? t('customers.active')
                            : t('customers.inactiveAccount')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={customers.data.meta}
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
