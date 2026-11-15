import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Order } from '@/features/cart/types';
import { OrderDetails } from '@/features/orders/OrderDetails';
import { OrderLookupForm } from '@/features/orders/OrderLookupForm';

export function TrackingPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const defaultNumber = params.get('number') ?? '';
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    document.title = `${t('tracking.title')} — Luphéra`;
  }, [t]);

  return (
    <div className="gutter pb-24 pt-10">
      <Breadcrumbs
        items={[{ label: t('product.breadcrumbHome'), to: '/' }, { label: t('nav.tracking') }]}
      />

      <div className="mt-8">
        <PageHeader eyebrow={t('tracking.eyebrow')} title={t('tracking.title')} lead={t('tracking.lead')} />
      </div>

      {order === null ? (
        <OrderLookupForm defaultNumber={defaultNumber} onFound={setOrder} />
      ) : (
        <div className="grid gap-8">
          <OrderDetails order={order} />
          <Button variant="secondary" className="justify-self-start" onClick={() => setOrder(null)}>
            {t('tracking.newSearch')}
          </Button>
        </div>
      )}
    </div>
  );
}
