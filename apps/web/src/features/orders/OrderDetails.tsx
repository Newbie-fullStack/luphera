import { useTranslation } from 'react-i18next';

import { formatDateTime, formatMAD } from '@/lib/format';

import type { Order } from '@/features/cart/types';

export function OrderDetails({ order }: { order: Order }) {
  const { t } = useTranslation();
  const placedAt = formatDateTime(order.placed_at);

  return (
    <div className="grid gap-8">
      <dl className="grid gap-4 border-y border-ligne py-6 sm:grid-cols-3">
        <div className="grid gap-1">
          <dt className="text-[10.5px] uppercase tracking-[.24em] text-brume">
            {t('confirmation.number')}
          </dt>
          <dd className="font-display text-lg text-ivoire">{order.number}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[10.5px] uppercase tracking-[.24em] text-brume">
            {t('confirmation.status')}
          </dt>
          <dd className="text-[15px] text-or-clair">{t(`order.status.${order.status}`)}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[10.5px] uppercase tracking-[.24em] text-brume">
            {t('confirmation.total')}
          </dt>
          <dd className="font-display text-lg text-ivoire">{formatMAD(order.totals.total_cents)}</dd>
        </div>
      </dl>

      {placedAt !== null ? (
        <p className="text-[12px] text-brume">{t('tracking.placedAt', { date: placedAt })}</p>
      ) : null}

      <section className="grid gap-4" aria-label={t('tracking.items')}>
        <h2 className="text-[11px] uppercase tracking-[.28em] text-or">{t('tracking.items')}</h2>
        <ul className="grid gap-3">
          {order.items.map((item) => (
            <li
              key={`${item.sku}-${item.quantity}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-ligne pb-3 last:border-0 last:pb-0"
            >
              <div className="grid gap-1">
                <p className="text-[15px] leading-snug text-ivoire">{item.product_name}</p>
                <p className="text-[11px] uppercase tracking-[.18em] text-brume">
                  {item.variant_label ?? item.sku} × {item.quantity}
                </p>
              </div>
              <p className="whitespace-nowrap text-sm text-texte">{formatMAD(item.line_total_cents)}</p>
            </li>
          ))}
        </ul>

        <dl className="grid gap-2 border-t border-ligne pt-4 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-brume">{t('cart.subtotal')}</dt>
            <dd className="text-ivoire">{formatMAD(order.totals.subtotal_cents)}</dd>
          </div>
          {order.totals.discount_cents > 0 ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-brume">
                {t('cart.discount')}
                {order.coupon_code !== null ? ` · ${order.coupon_code}` : ''}
              </dt>
              <dd className="text-or-clair">−{formatMAD(order.totals.discount_cents)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-brume">{t('cart.shipping')}</dt>
            <dd className="text-ivoire">
              {order.totals.shipping_cents === 0
                ? t('cart.shippingFree')
                : formatMAD(order.totals.shipping_cents)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-ligne pt-3">
            <dt className="text-[11px] uppercase tracking-[.24em] text-brume">{t('cart.total')}</dt>
            <dd className="font-display text-xl text-ivoire">{formatMAD(order.totals.total_cents)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-3" aria-label={t('tracking.address')}>
        <h2 className="text-[11px] uppercase tracking-[.28em] text-or">{t('tracking.address')}</h2>
        <address className="not-italic text-[14px] leading-relaxed text-texte">
          <span className="block text-ivoire">{order.customer.name}</span>
          <span className="block">{order.customer.phone}</span>
          {order.customer.email !== null ? <span className="block">{order.customer.email}</span> : null}
          <span className="block">
            {order.address.line1}, {order.address.district}
          </span>
          <span className="block">{order.address.city}</span>
          {order.address.landmark !== null ? (
            <span className="block text-brume">{order.address.landmark}</span>
          ) : null}
        </address>
        {order.note !== null ? <p className="text-[12.5px] text-brume">{order.note}</p> : null}
      </section>

      <section className="grid gap-3" aria-label={t('tracking.shipment')}>
        <h2 className="text-[11px] uppercase tracking-[.28em] text-or">{t('tracking.shipment')}</h2>
        {order.shipment === null ? (
          <p className="text-[13px] text-brume">{t('tracking.noShipment')}</p>
        ) : (
          <dl className="grid gap-2 text-sm">
            {order.shipment.carrier !== null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-brume">{t('tracking.carrier')}</dt>
                <dd className="text-ivoire">{order.shipment.carrier}</dd>
              </div>
            ) : null}
            {order.shipment.tracking_number !== null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-brume">{t('tracking.trackingNumber')}</dt>
                <dd className="text-ivoire">{order.shipment.tracking_number}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </section>

      <section className="grid gap-3" aria-label={t('tracking.history')}>
        <h2 className="text-[11px] uppercase tracking-[.28em] text-or">{t('tracking.history')}</h2>
        <ol className="grid gap-2 border-l border-ligne pl-5">
          {order.events.map((event, index) => {
            const at = formatDateTime(event.at);

            return (
              <li key={`${event.status}-${index}`} className="grid gap-0.5">
                <span className="text-[14px] text-ivoire">{t(`order.status.${event.status}`)}</span>
                {at !== null ? <span className="text-[11px] text-brume">{at}</span> : null}
                {event.comment !== null ? (
                  <span className="text-[12px] text-brume">{event.comment}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
