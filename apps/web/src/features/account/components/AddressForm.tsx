import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { FieldShell, TextField } from '@/components/ui/Field';
import type { AddressPayload } from '@/features/auth/types';
import { createAddressSchema, type AddressFormValues } from '@/features/auth/schemas';
import type { City } from '@/features/cart/types';
import { normalizeMoroccanPhone } from '@/lib/phone';

interface AddressFormProps {
  address?: {
    label: string | null;
    recipient_name: string;
    phone: string;
    city: { slug: string } | null;
    district: string;
    address: string;
    landmark: string | null;
    is_default: boolean;
  } | null;
  cities: City[];
  submitting?: boolean;
  onSubmit: (payload: AddressPayload) => void | Promise<void>;
  onCancel?: () => void;
}

export function AddressForm({
  address = null,
  cities,
  submitting = false,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => createAddressSchema(t), [t]);
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: address?.label ?? '',
      recipient_name: address?.recipient_name ?? '',
      phone: address?.phone ?? '',
      city: address?.city?.slug ?? '',
      district: address?.district ?? '',
      address: address?.address ?? '',
      landmark: address?.landmark ?? '',
      is_default: address?.is_default ?? false,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit({
      label: values.label === '' ? null : values.label,
      recipient_name: values.recipient_name,
      phone: normalizeMoroccanPhone(values.phone),
      city: values.city,
      district: values.district,
      address: values.address,
      landmark: values.landmark === '' ? null : values.landmark,
      is_default: values.is_default,
    });
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5 border border-ligne p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="label"
          label={t('account.addresses.label')}
          placeholder={t('account.addresses.labelPlaceholder')}
          error={form.formState.errors.label?.message}
          {...form.register('label')}
        />

        <TextField
          id="recipient_name"
          label={t('account.addresses.recipient')}
          autoComplete="name"
          error={form.formState.errors.recipient_name?.message}
          {...form.register('recipient_name')}
        />

        <TextField
          id="phone"
          label={t('account.addresses.phone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />

        <FieldShell
          id="city"
          label={t('account.addresses.city')}
          error={form.formState.errors.city?.message}
        >
          <select
            id="city"
            className="field-input"
            aria-invalid={form.formState.errors.city ? true : undefined}
            aria-describedby={form.formState.errors.city ? 'city-error' : undefined}
            {...form.register('city')}
          >
            <option value="">{t('account.addresses.cityPlaceholder')}</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </FieldShell>

        <TextField
          id="district"
          label={t('account.addresses.district')}
          placeholder={t('account.addresses.districtPlaceholder')}
          autoComplete="address-level3"
          error={form.formState.errors.district?.message}
          {...form.register('district')}
        />

        <TextField
          id="address"
          label={t('account.addresses.address')}
          placeholder={t('account.addresses.addressPlaceholder')}
          autoComplete="street-address"
          error={form.formState.errors.address?.message}
          {...form.register('address')}
        />

        <TextField
          id="landmark"
          label={t('account.addresses.landmark')}
          autoComplete="off"
          error={form.formState.errors.landmark?.message}
          {...form.register('landmark')}
        />
      </div>

      <label htmlFor="is_default" className="flex items-center gap-3 text-[13px] text-texte">
        <input
          id="is_default"
          type="checkbox"
          className="size-4 accent-or"
          {...form.register('is_default')}
        />
        <span>{t('account.addresses.isDefault')}</span>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t('account.addresses.saving') : t('account.addresses.save')}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            {t('account.addresses.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
