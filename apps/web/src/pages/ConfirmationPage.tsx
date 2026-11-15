import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { fetchOrder } from '@/features/cart/api';
import type { Order } from '@/features/cart/types';
import { OrderDetails } from '@/features/orders/OrderDetails';
import { OrderLookupForm } from '@/features/orders/OrderLookupForm';
import { readOrderToken } from '@/features/orders/storage';

export function ConfirmationPage() {
  const { number = '' } = useParams<{ number: string }>();
  const { t } = useTranslation();
  const token = useMemo(() => readOrderToken(number), [number]);
  const [lookedUp, setLookedUp] = useState<Order | null>(null);

  const query = useQuery({
    queryKey: ['order', number, token],
    queryFn: () => fetchOrder(number, { token: token ?? undefined }),
    enabled: token !== null && number !== '',
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    document.title = `${t('confirmation.title')} — Luphéra`;
  }, [t]);

  const order = lookedUp ?? query.data ?? null;

  return (
    <div className="gutter pb-24 pt-10">
      <Breadcrumbs
        items={[{ label: t('product.breadcrumbHome'), to: '/' }, { label: t('nav.checkout') }]}
      />

      <div className="mt-8">
        {order !== null ? (
          <PageHeader
            eyebrow={t('confirmation.title')}
            title={t('confirmation.title')}
            lead={t('confirmation.lead', { name: order.customer.name, number: order.number })}
          />
        ) : (
          <PageHeader
            eyebrow={t('confirmation.title')}
            title={query.isPending && token !== null ? t('confirmation.loading') : t('confirmation.notFoundTitle')}
            lead={query.isPending && token !== null ? undefined : t('confirmation.notFoundBody')}
          />
        )}
      </div>

      {order !== null ? (
        <div className="grid gap-8">
          <OrderDetails order={order} />

          <div className="grid gap-3 border border-ligne p-6">
            <p className="text-[14px] leading-relaxed text-texte">{t('confirmation.next')}</p>
            <p className="text-[12.5px] leading-relaxed text-brume">{t('confirmation.keepLink')}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink to={`/suivi?number=${encodeURIComponent(order.number)}`}>
              {t('confirmation.track')}
            </ButtonLink>
            <ButtonLink to="/boutique" variant="secondary">
              {t('confirmation.continue')}
            </ButtonLink>
          </div>
        </div>
      ) : query.isPending && token !== null ? (
        <p role="status" className="text-[11px] uppercase tracking-[.3em] text-brume">
          {t('confirmation.loading')}
        </p>
      ) : (
        <div className="grid gap-6">
          <OrderLookupForm defaultNumber={number} onFound={setLookedUp} />
          <p className="text-[12px] text-brume">{t('confirmation.lookup')}</p>
        </div>
      )}
    </div>
  );
}
