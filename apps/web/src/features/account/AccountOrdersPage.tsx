import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button, ButtonLink } from '@/components/ui/Button';
import { downloadInvoice, fetchAccountOrders } from '@/features/auth/api';
import type { Order } from '@/features/cart/types';
import { formatDateTime, formatMAD } from '@/lib/format';
import { saveBlob } from '@/lib/download';

export function AccountOrdersPage() {
  const { t } = useTranslation();
  const orders = useQuery({ queryKey: ['account-orders'], queryFn: fetchAccountOrders });
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const invoice = useMutation({
    mutationFn: (number: string) => downloadInvoice(number),
    onSuccess: (blob, number) => {
      setInvoiceError(null);
      saveBlob(blob, `facture-${number}.pdf`);
    },
    onError: () => setInvoiceError(t('account.orders.invoiceError')),
  });

  useEffect(() => {
    document.title = `${t('account.orders.title')} — Luphéra`;
  }, [t]);

  if (orders.isLoading) {
    return (
      <p role="status" className="py-10 text-[11px] uppercase tracking-[.3em] text-brume">
        {t('account.orders.loading')}
      </p>
    );
  }

  if (orders.isError) {
    return (
      <p role="alert" className="border border-[#5a2b2b] bg-[#2a1414] p-4 text-[13px] text-[#e8b4b4]">
        {t('account.orders.error')}
      </p>
    );
  }

  const list = orders.data?.orders ?? [];

  return (
    <section className="grid gap-6">
      <header className="grid gap-2">
        <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] leading-tight">{t('account.orders.title')}</h2>
        <p className="text-[14px] leading-relaxed text-brume">{t('account.orders.lead')}</p>
      </header>

      {invoiceError !== null ? (
        <p role="alert" className="text-[13px] text-[#e8b4b4]">
          {invoiceError}
        </p>
      ) : null}

      {list.length === 0 ? (
        <div className="grid gap-5 border border-ligne p-6">
          <p className="text-[15px] text-texte">{t('account.orders.empty')}</p>
          <ButtonLink to="/boutique" className="justify-self-start">
            {t('account.orders.emptyAction')}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-4">
          {list.map((order) => (
            <OrderRow
              key={order.number}
              order={order}
              downloading={invoice.isPending && invoice.variables === order.number}
              onInvoice={() => invoice.mutate(order.number)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderRow({
  order,
  downloading,
  onInvoice,
}: {
  order: Order;
  downloading: boolean;
  onInvoice: () => void;
}) {
  const { t } = useTranslation();
  const placedAt = formatDateTime(order.placed_at);

  return (
    <li className="grid gap-4 border border-ligne p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-1.5">
        <p className="font-display text-lg text-ivoire">{order.number}</p>
        <p className="text-[12px] text-brume">
          {placedAt ?? '—'} · {t(`order.status.${order.status}`)}
        </p>
        <p className="text-[14px] text-texte">{formatMAD(order.totals.total_cents)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/compte/commandes/${encodeURIComponent(order.number)}`}
          className="lnk text-[10.5px]"
        >
          {t('account.orders.details')}
        </Link>
        {order.status === 'delivered' ? (
          <Button variant="secondary" onClick={onInvoice} disabled={downloading} className="min-h-10 px-4 text-[10.5px]">
            {t('account.orders.invoice')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
