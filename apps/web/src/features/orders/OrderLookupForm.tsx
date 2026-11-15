import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { fetchOrder } from '@/features/cart/api';
import type { Order } from '@/features/cart/types';
import { ApiError } from '@/lib/api/client';
import { isValidMoroccanPhone, normalizeMoroccanPhone } from '@/lib/phone';

interface OrderLookupFormProps {
  defaultNumber?: string;
  onFound: (order: Order) => void;
}

export function OrderLookupForm({ defaultNumber = '', onFound }: OrderLookupFormProps) {
  const { t } = useTranslation();
  const [number, setNumber] = useState(defaultNumber);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (!isValidMoroccanPhone(phone)) {
      setError(t('checkout.errors.phoneFormat'));
      return;
    }

    setPending(true);
    setError(null);

    try {
      const order = await fetchOrder(number.trim().toUpperCase(), {
        phone: normalizeMoroccanPhone(phone),
      });

      onFound(order);
    } catch (lookupError) {
      setError(
        lookupError instanceof ApiError && lookupError.status === 404
          ? t('tracking.notFound')
          : t('tracking.errorGeneric'),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="grid max-w-md gap-5 border border-ligne p-6"
    >
      <TextField
        id="lookup-number"
        label={t('tracking.number')}
        placeholder={t('tracking.numberPlaceholder')}
        autoComplete="off"
        value={number}
        onChange={(event) => setNumber(event.target.value)}
      />

      <TextField
        id="lookup-phone"
        label={t('tracking.phone')}
        placeholder={t('tracking.phonePlaceholder')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />

      {error !== null ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('tracking.submitting') : t('tracking.submit')}
      </Button>
    </form>
  );
}
