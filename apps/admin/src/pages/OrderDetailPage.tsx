import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, MessageCircle, Phone, Truck } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import {
  downloadPackingSlip,
  fetchOrder,
  transitionOrder,
} from '@/lib/api/admin';
import type { OrderStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDateTime, formatMAD, formatPhone, whatsappHref } from '@/lib/format';

/**
 * Allowed transitions, mirrored from the API enum so the operator only sees
 * moves the server will accept. The API remains the authority.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'failed_delivery'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
  failed_delivery: [],
};

export function OrderDetailPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { number = '' } = useParams();
  const queryClient = useQueryClient();

  const [target, setTarget] = useState<OrderStatus | ''>('');
  const [comment, setComment] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const order = useQuery({
    queryKey: ['order', number],
    queryFn: () => fetchOrder(number),
    enabled: number !== '',
  });

  const transition = useMutation({
    mutationFn: (status: OrderStatus) =>
      transitionOrder(number, {
        status,
        comment: comment === '' ? undefined : comment,
        carrier: carrier === '' ? undefined : carrier,
        tracking_number: tracking === '' ? undefined : tracking,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['order', number], data);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTarget('');
      setComment('');
      setFeedback(t('orders.statusUpdated'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  if (order.isLoading) {
    return <Spinner />;
  }

  if (order.isError || order.data === undefined) {
    return <EmptyState title={t('common.empty')} />;
  }

  const data = order.data;
  const options = TRANSITIONS[data.status];
  const canTransition = can('orders.manage') || (can('orders.confirm') && target === 'confirmed');
  const showsShipment = target === 'shipped' || target === 'delivered';
  const wa = whatsappHref(data.customer.phone);

  return (
    <div className="grid gap-5">
      <Link to="/commandes" className="flex items-center gap-2 text-xs text-brume hover:text-ivoire">
        <ArrowLeft size={14} aria-hidden="true" />
        {t('common.back')}
      </Link>

      <PageHeader
        eyebrow={t('orders.detail')}
        title={data.number}
        subtitle={formatDateTime(data.placed_at)}
        actions={
          <>
            <StatusBadge value={data.status} kind="order" />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                void downloadPackingSlip(data.number);
              }}
            >
              <Download size={14} aria-hidden="true" />
              {t('orders.packingSlip')}
            </button>
          </>
        }
      />

      <section className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('orders.items')}</h2>
            <span className="text-xs text-brume">
              {t('orders.itemsCount', { count: data.items_count })}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('products.title')}</th>
                  <th>{t('products.sku')}</th>
                  <th className="num">{t('products.price')}</th>
                  <th className="num">{t('dashboard.quantity')}</th>
                  <th className="num">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.sku}-${item.variant_label ?? ''}`}>
                    <td>
                      <p className="text-ivoire">{item.product_name}</p>
                      <p className="text-xs text-brume">{item.variant_label ?? '—'}</p>
                    </td>
                    <td className="font-mono text-xs text-brume">{item.sku}</td>
                    <td className="num">{formatMAD(item.unit_price_cents)}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">{formatMAD(item.line_total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-1.5 border-t border-ligne px-5 py-4 text-sm">
            <div className="flex justify-between text-brume">
              <span>{t('orders.subtotal')}</span>
              <span>{formatMAD(data.totals.subtotal_cents)}</span>
            </div>
            {data.totals.discount_cents > 0 ? (
              <div className="flex justify-between text-brume">
                <span>
                  {t('orders.discount')}
                  {data.coupon_code !== null ? ` · ${data.coupon_code}` : ''}
                </span>
                <span>-{formatMAD(data.totals.discount_cents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-brume">
              <span>{t('orders.shipping')}</span>
              <span>{formatMAD(data.totals.shipping_cents)}</span>
            </div>
            <div className="flex justify-between border-t border-ligne pt-2 text-ivoire">
              <span>{t('common.total')}</span>
              <span>{formatMAD(data.totals.total_cents)}</span>
            </div>
            <p className="pt-1 text-xs text-brume">
              {t('orders.payment')} · {t('orders.cod')}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t('orders.customer')}</h2>
            </div>
            <div className="panel-body grid gap-2">
              <p className="text-ivoire">{data.customer.name}</p>
              <p className="text-sm text-brume">{formatPhone(data.customer.phone)}</p>
              {data.customer.email !== null ? (
                <p className="text-sm text-brume">{data.customer.email}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${data.customer.phone}`} className="btn btn-ghost btn-sm">
                  <Phone size={13} aria-hidden="true" />
                  {t('orders.call')}
                </a>
                {wa !== null ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    <MessageCircle size={13} aria-hidden="true" />
                    {t('orders.whatsapp')}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t('orders.address')}</h2>
            </div>
            <div className="panel-body grid gap-1 text-sm text-brume">
              <p className="text-ivoire">{data.address.line1 ?? '—'}</p>
              {data.address.landmark !== null && data.address.landmark !== undefined ? (
                <p>{data.address.landmark}</p>
              ) : null}
              <p>
                {[data.address.district, data.address.city].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>

          {data.note !== null ? (
            <div className="panel">
              <div className="panel-head">
                <h2 className="panel-title">{t('orders.note')}</h2>
              </div>
              <p className="panel-body text-sm leading-relaxed text-brume">{data.note}</p>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t('orders.shipment')}</h2>
            </div>
            <div className="panel-body grid gap-1 text-sm text-brume">
              {data.shipment === null ? (
                <p>{t('orders.noShipment')}</p>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-ivoire">
                    <Truck size={14} aria-hidden="true" />
                    {data.shipment.carrier ?? '—'}
                  </p>
                  <p>{data.shipment.tracking_number ?? '—'}</p>
                  <p>
                    {t('orders.shipped')} · {formatDateTime(data.shipment.shipped_at)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('orders.changeStatus')}</h2>
          </div>
          <div className="panel-body grid gap-3">
            {options.length === 0 ? (
              <p className="text-sm text-brume">{t('common.none')}</p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="order-target">
                      {t('orders.statusLabel')}
                    </label>
                    <select
                      id="order-target"
                      className="field-select"
                      value={target}
                      onChange={(event) => {
                        setTarget(event.target.value as OrderStatus | '');
                      }}
                    >
                      <option value="">—</option>
                      {options.map((value) => (
                        <option key={value} value={value}>
                          {t(`orders.${value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showsShipment ? (
                    <>
                      <div>
                        <label className="field-label" htmlFor="order-carrier">
                          {t('orders.carrier')}
                        </label>
                        <input
                          id="order-carrier"
                          className="field-input"
                          value={carrier}
                          onChange={(event) => {
                            setCarrier(event.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="order-tracking">
                          {t('orders.tracking')}
                        </label>
                        <input
                          id="order-tracking"
                          className="field-input"
                          value={tracking}
                          onChange={(event) => {
                            setTracking(event.target.value);
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                <div>
                  <label className="field-label" htmlFor="order-comment">
                    {t('orders.comment')}
                  </label>
                  <textarea
                    id="order-comment"
                    className="field-textarea"
                    placeholder={t('orders.commentPlaceholder')}
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                    }}
                  />
                </div>
                {feedback !== null ? (
                  <p className="text-xs text-brume" role="status">
                    {feedback}
                  </p>
                ) : null}
                <div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={target === '' || !canTransition || transition.isPending}
                    onClick={() => {
                      if (target !== '') {
                        transition.mutate(target);
                      }
                    }}
                  >
                    {target === 'confirmed'
                      ? t('orders.confirmAction')
                      : t('orders.changeStatus')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('orders.history')}</h2>
          </div>
          <ol className="panel-body grid gap-3">
            {data.events.length === 0 ? (
              <li className="text-sm text-brume">{t('common.none')}</li>
            ) : (
              data.events
                .slice()
                .reverse()
                .map((event, index) => (
                  <li
                    key={`${event.status}-${event.at ?? index}`}
                    className="grid gap-1 border-l border-ligne-forte pl-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={event.status} kind="order" />
                      <span className="text-xs text-brume">{formatDateTime(event.at)}</span>
                    </div>
                    {event.author !== null && event.author !== undefined ? (
                      <p className="text-xs text-brume capitalize">{event.author}</p>
                    ) : null}
                    {event.comment !== null ? (
                      <p className="text-sm text-texte">{event.comment}</p>
                    ) : null}
                  </li>
                ))
            )}
          </ol>
        </div>
      </section>
    </div>
  );
}
