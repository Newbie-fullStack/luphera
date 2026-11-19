import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { fetchDashboard } from '@/lib/api/admin';
import { formatDate, formatMAD, formatPercent } from '@/lib/format';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value mt-2">{value}</p>
      {hint !== undefined ? <p className="mt-1 text-xs text-brume">{hint}</p> : null}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

  if (dashboard.isLoading) {
    return <Spinner />;
  }

  if (dashboard.isError || dashboard.data === undefined) {
    return <p className="text-err">{t('common.error')}</p>;
  }

  const data = dashboard.data;
  const maxRevenue = Math.max(...data.series.map((day) => day.revenue_cents), 1);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={t('nav.groupPilotage')}
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <Link to="/commandes?status=pending" className="btn btn-secondary btn-sm">
            {t('dashboard.pending')} · {data.orders_pending}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t('dashboard.revenue')} value={formatMAD(data.revenue_30d_cents)} />
        <Kpi
          label={t('dashboard.orders')}
          value={String(data.orders_30d)}
          hint={`${t('dashboard.ordersToday')} : ${data.orders_today}`}
        />
        <Kpi
          label={t('dashboard.averageBasket')}
          value={formatMAD(data.average_basket_30d_cents)}
        />
        <Kpi
          label={t('dashboard.confirmationRate')}
          value={formatPercent(data.confirmation_rate_30d)}
          hint={`${t('dashboard.customers')} : ${data.customers_total} · ${t('dashboard.newCustomers')} : ${data.customers_new_30d}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('dashboard.curve')}</h2>
            <span className="text-xs text-brume">
              {formatMAD(data.revenue_30d_cents)} · {data.orders_30d} {t('dashboard.orders')}
            </span>
          </div>
          <div className="panel-body">
            <div className="flex h-44 items-end gap-[3px]" role="img" aria-label={t('dashboard.curve')}>
              {data.series.map((day) => {
                const empty = day.revenue_cents === 0;
                const height = empty ? 2 : Math.max(4, Math.round((day.revenue_cents / maxRevenue) * 100));

                return (
                  <div
                    key={day.date}
                    className="group relative h-full flex-1"
                    title={`${formatDate(day.date)} — ${formatMAD(day.revenue_cents)}`}
                  >
                    <div
                      className={
                        empty
                          ? 'absolute inset-x-0 bottom-0 bg-ligne'
                          : 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-or-profond to-or transition-opacity group-hover:opacity-80'
                      }
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-[10px] tracking-[0.14em] text-brume uppercase">
              <span>{formatDate(data.series[0]?.date)}</span>
              <span>{formatDate(data.series.at(-1)?.date)}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('dashboard.lowStock')}</h2>
            <Link to="/stock?low=1" className="text-[10px] tracking-[0.16em] text-or uppercase">
              {t('nav.stock')}
            </Link>
          </div>
          <div className="panel-body grid gap-3">
            {data.low_stock.length === 0 ? (
              <p className="text-sm text-brume">{t('dashboard.allGood')}</p>
            ) : (
              data.low_stock.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ivoire">{item.product.name}</p>
                    <p className="text-xs text-brume">
                      {item.sku} · {item.label ?? '—'}
                    </p>
                  </div>
                  <span className="badge badge-warn">
                    <AlertTriangle size={11} aria-hidden="true" />
                    {item.stock} / {item.threshold}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('dashboard.topProducts')}</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('products.title')}</th>
                  <th className="num">{t('dashboard.quantity')}</th>
                  <th className="num">{t('dashboard.revenueShort')}</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-brume">
                      {t('dashboard.noSales')}
                    </td>
                  </tr>
                ) : (
                  data.top_products.map((product) => (
                    <tr key={product.name}>
                      <td>{product.name}</td>
                      <td className="num">{product.quantity}</td>
                      <td className="num">{formatMAD(product.revenue_cents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('dashboard.salesByCity')}</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('common.city')}</th>
                  <th className="num">{t('dashboard.orders')}</th>
                  <th className="num">{t('dashboard.revenueShort')}</th>
                </tr>
              </thead>
              <tbody>
                {data.sales_by_city.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-brume">
                      {t('dashboard.noSales')}
                    </td>
                  </tr>
                ) : (
                  data.sales_by_city.map((city) => (
                    <tr key={city.city}>
                      <td>{city.city}</td>
                      <td className="num">{city.orders}</td>
                      <td className="num">{formatMAD(city.revenue_cents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
