import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { downloadInvoice, fetchAccountOrder } from '@/features/auth/api';
import { OrderDetails } from '@/features/orders/OrderDetails';
import { saveBlob } from '@/lib/download';

export function AccountOrderPage() {
  const { t } = useTranslation();
  const { number = '' } = useParams<{ number: string }>();
  const order = useQuery({
    queryKey: ['account-order', number],
    queryFn: () => fetchAccountOrder(number),
    enabled: number !== '',
  });
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const invoice = useMutation({
    mutationFn: () => downloadInvoice(number),
    onSuccess: (blob) => {
      setInvoiceError(null);
      saveBlob(blob, `facture-${number}.pdf`);
    },
    onError: () => setInvoiceError(t('account.orders.invoiceError')),
  });

  useEffect(() => {
    document.title = `${t('account.orders.title')} — Luphéra`;
  }, [t]);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/compte/commandes" className="lnk text-[10.5px]">
          {t('account.order.back')}
        </Link>
        {order.data?.status === 'delivered' ? (
          <Button
            variant="secondary"
            onClick={() => invoice.mutate()}
            disabled={invoice.isPending}
            className="min-h-10 px-4 text-[10.5px]"
          >
            {t('account.orders.invoice')}
          </Button>
        ) : null}
      </div>

      {invoiceError !== null ? (
        <p role="alert" className="text-[13px] text-[#e8b4b4]">
          {invoiceError}
        </p>
      ) : null}

      {order.isLoading ? (
        <p role="status" className="py-10 text-[11px] uppercase tracking-[.3em] text-brume">
          {t('account.orders.loading')}
        </p>
      ) : order.isError || order.data === undefined ? (
        <p role="alert" className="border border-[#5a2b2b] bg-[#2a1414] p-4 text-[13px] text-[#e8b4b4]">
          {t('account.order.notFound')}
        </p>
      ) : (
        <OrderDetails order={order.data} />
      )}
    </section>
  );
}
