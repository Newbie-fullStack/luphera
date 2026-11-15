import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ShoppingBag } from 'lucide-react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { Button, ButtonLink } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { FieldShell, TextField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { fetchCities, placeOrder } from '@/features/cart/api';
import { useCart } from '@/features/cart/useCart';
import { createCheckoutSchema, type CheckoutFormValues } from '@/features/orders/checkoutSchema';
import { rememberOrderToken } from '@/features/orders/storage';
import { ApiError } from '@/lib/api/client';
import { formatMAD } from '@/lib/format';
import { normalizeMoroccanPhone } from '@/lib/phone';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cart, isLoading, city, setCity, refresh, openCart } = useCart();
  const cities = useQuery({ queryKey: ['shipping', 'cities'], queryFn: fetchCities, staleTime: 300_000 });
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => createCheckoutSchema(t), [t]);
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      phone: '',
      email: '',
      city: city ?? '',
      district: '',
      address: '',
      landmark: '',
      note: '',
      terms: false,
    },
  });

  const selectedCity = useWatch({ control: form.control, name: 'city' });

  useEffect(() => {
    setCity(selectedCity === undefined || selectedCity === '' ? null : selectedCity);
  }, [selectedCity, setCity]);

  useEffect(() => {
    document.title = `${t('checkout.title')} — Luphéra`;
  }, [t]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting) {
      return;
    }

    setServerError(null);
    setSubmitting(true);

    try {
      const order = await placeOrder(
        {
          customer_name: values.customer_name,
          phone: normalizeMoroccanPhone(values.phone),
          email: values.email === '' ? null : values.email,
          city: values.city,
          district: values.district,
          address: values.address,
          landmark: values.landmark === '' ? null : values.landmark,
          note: values.note === '' ? null : values.note,
          payment_method: 'cod',
          terms: true,
        },
        idempotencyKey,
      );

      if (order.tracking !== null) {
        rememberOrderToken(order.number, order.tracking.token);
      }

      refresh();
      void navigate(`/commande/confirmation/${order.number}`);
    } catch (error) {
      if (error instanceof ApiError) {
        let focused = false;

        for (const [field, messages] of Object.entries(error.fields)) {
          if (!(field in schema.shape)) {
            continue;
          }

          const name = field as FieldPath<CheckoutFormValues>;
          form.setError(name, { type: 'server', message: messages[0] });

          if (!focused) {
            form.setFocus(name);
            focused = true;
          }
        }

        setServerError(
          error.code === 'cart_empty' ||
            error.code === 'insufficient_stock' ||
            error.code === 'coupon_unavailable'
            ? t('checkout.errorCart')
            : focused
              ? t('checkout.errorFields')
              : error.message,
        );
      } else {
        setServerError(t('checkout.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  if (isLoading) {
    return (
      <div className="gutter grid min-h-[50vh] place-items-center py-24">
        <p role="status" className="text-[11px] uppercase tracking-[.3em] text-brume">
          {t('cart.loading')}
        </p>
      </div>
    );
  }

  if (cart === null || cart.items.length === 0) {
    return (
      <div className="gutter pb-24 pt-10">
        <Breadcrumbs
          items={[
            { label: t('product.breadcrumbHome'), to: '/' },
            { label: t('nav.checkout') },
          ]}
        />
        <div className="mt-10">
          <PageHeader eyebrow={t('checkout.eyebrow')} title={t('checkout.emptyTitle')} lead={t('checkout.emptyBody')}>
            <ButtonLink to="/boutique" className="mt-2">
              {t('checkout.emptyAction')}
            </ButtonLink>
          </PageHeader>
        </div>
      </div>
    );
  }

  const totals = cart.totals;
  const deliveryDays = cart.city?.delivery_days ?? null;

  return (
    <div className="gutter pb-24 pt-10">
      <Breadcrumbs
        items={[
          { label: t('product.breadcrumbHome'), to: '/' },
          { label: t('nav.checkout') },
        ]}
      />

      <div className="mt-8">
        <PageHeader eyebrow={t('checkout.eyebrow')} title={t('checkout.title')} lead={t('checkout.lead')} />
      </div>

      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-16"
      >
        <div className="grid gap-10">
          <fieldset className="grid gap-5 border-0 p-0">
            <legend className="mb-4 text-[11px] uppercase tracking-[.28em] text-or">
              {t('checkout.contact')}
            </legend>

            <TextField
              id="customer_name"
              label={t('checkout.name')}
              placeholder={t('checkout.namePlaceholder')}
              autoComplete="name"
              error={form.formState.errors.customer_name?.message}
              {...form.register('customer_name')}
            />

            <TextField
              id="phone"
              label={t('checkout.phone')}
              placeholder={t('checkout.phonePlaceholder')}
              hint={t('checkout.phoneHint')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              error={form.formState.errors.phone?.message}
              {...form.register('phone')}
            />

            <TextField
              id="email"
              label={t('checkout.email')}
              placeholder={t('checkout.emailPlaceholder')}
              type="email"
              autoComplete="email"
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
          </fieldset>

          <fieldset className="grid gap-5 border-0 p-0">
            <legend className="mb-4 text-[11px] uppercase tracking-[.28em] text-or">
              {t('checkout.delivery')}
            </legend>

            <FieldShell id="city" label={t('checkout.city')} error={form.formState.errors.city?.message}>
              <select
                id="city"
                className="field-input"
                aria-invalid={form.formState.errors.city ? true : undefined}
                aria-describedby={form.formState.errors.city ? 'city-error' : undefined}
                {...form.register('city')}
              >
                <option value="">{t('checkout.cityPlaceholder')}</option>
                {(cities.data ?? []).map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name} — {formatMAD(option.fee_cents)} · {option.delivery_days}
                  </option>
                ))}
              </select>
            </FieldShell>

            <TextField
              id="district"
              label={t('checkout.district')}
              placeholder={t('checkout.districtPlaceholder')}
              autoComplete="address-level3"
              error={form.formState.errors.district?.message}
              {...form.register('district')}
            />

            <TextField
              id="address"
              label={t('checkout.address')}
              placeholder={t('checkout.addressPlaceholder')}
              autoComplete="street-address"
              error={form.formState.errors.address?.message}
              {...form.register('address')}
            />

            <TextField
              id="landmark"
              label={t('checkout.landmark')}
              placeholder={t('checkout.landmarkPlaceholder')}
              error={form.formState.errors.landmark?.message}
              {...form.register('landmark')}
            />

            <FieldShell id="note" label={t('checkout.note')} error={form.formState.errors.note?.message}>
              <textarea
                id="note"
                rows={3}
                placeholder={t('checkout.notePlaceholder')}
                className="field-input resize-y"
                aria-invalid={form.formState.errors.note ? true : undefined}
                aria-describedby={form.formState.errors.note ? 'note-error' : undefined}
                {...form.register('note')}
              />
            </FieldShell>
          </fieldset>

          <fieldset className="grid gap-5 border-0 p-0">
            <legend className="mb-4 text-[11px] uppercase tracking-[.28em] text-or">
              {t('checkout.payment')}
            </legend>

            <div className="grid gap-2 border border-ligne-forte p-5">
              <p className="flex items-center gap-2 text-[15px] text-ivoire">
                <Check size={16} className="text-or-clair" aria-hidden="true" />
                {t('checkout.cod')}
              </p>
              <p className="text-[12.5px] leading-relaxed text-brume">{t('checkout.codHint')}</p>
            </div>
          </fieldset>

          <div className="grid gap-3 border-t border-ligne pt-6">
            <label htmlFor="terms" className="flex items-start gap-3 text-[13.5px] leading-relaxed text-texte">
              <input
                id="terms"
                type="checkbox"
                className="mt-0.5 size-4 accent-or"
                aria-invalid={form.formState.errors.terms ? true : undefined}
                aria-describedby={form.formState.errors.terms ? 'terms-error' : undefined}
                {...form.register('terms')}
              />
              <span>
                {t('checkout.terms')}{' '}
                <Link to="/mentions-legales" className="lnk inline-flex">
                  {t('checkout.termsLink')}
                </Link>
              </span>
            </label>
            {form.formState.errors.terms ? (
              <p id="terms-error" role="alert" className="field-error">
                {form.formState.errors.terms.message}
              </p>
            ) : null}
          </div>

          {serverError !== null ? (
            <p role="alert" className="border border-[#5a2b2b] bg-[#2a1414] p-4 text-[13px] leading-relaxed text-[#e8b4b4]">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-3">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? t('checkout.submitting') : t('checkout.submit')}
            </Button>
            <p className="text-center">
              <button type="button" onClick={openCart} className="lnk text-[11px] uppercase tracking-[.2em]">
                {t('checkout.backToCart')}
              </button>
            </p>
          </div>
        </div>

        <aside aria-label={t('checkout.summary')} className="grid content-start gap-5 border border-ligne p-6 lg:sticky lg:top-28">
          <h2 className="text-[11px] uppercase tracking-[.28em] text-or">{t('checkout.summary')}</h2>

          <ul className="grid gap-4">
            {cart.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
                <div className="grid h-16 place-items-center bg-charbon/60">
                  {item.product.image ? (
                    <img
                      src={item.product.image.url}
                      alt=""
                      width={26}
                      height={62}
                      loading="lazy"
                      decoding="async"
                      className="max-h-14 w-auto object-contain"
                    />
                  ) : (
                    <ShoppingBag size={16} className="text-brume" aria-hidden="true" />
                  )}
                </div>
                <div className="grid content-start gap-1">
                  <p className="text-[14px] leading-snug text-ivoire">{item.product.name}</p>
                  <p className="text-[11px] uppercase tracking-[.18em] text-brume">
                    {item.variant.label} × {item.quantity}
                  </p>
                  <p className="text-[13px] text-texte">{formatMAD(item.line_total_cents)}</p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="grid gap-2 border-t border-ligne pt-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-brume">{t('cart.subtotal')}</dt>
              <dd className="text-ivoire">{formatMAD(totals.subtotal_cents)}</dd>
            </div>
            {totals.discount_cents > 0 ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-brume">{t('cart.discount')}</dt>
                <dd className="text-or-clair">−{formatMAD(totals.discount_cents)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-brume">{t('cart.shipping')}</dt>
              <dd className="text-ivoire">
                {totals.shipping_cents === 0 ? t('cart.shippingFree') : formatMAD(totals.shipping_cents)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-ligne pt-3">
              <dt className="text-[11px] uppercase tracking-[.24em] text-brume">{t('checkout.total')}</dt>
              <dd className="font-display text-xl text-ivoire">{formatMAD(totals.total_cents)}</dd>
            </div>
          </dl>

          <p className="text-[11px] leading-relaxed text-brume">
            {deliveryDays === null
              ? t('checkout.deliveryUnknown')
              : t('checkout.deliveryEstimate', { days: deliveryDays })}
          </p>

          {cart.coupon ? (
            <p className="text-[11px] text-or-clair">{t('checkout.couponApplied', { code: cart.coupon.code })}</p>
          ) : null}

          <p className="text-[10.5px] leading-relaxed text-brume/80">{t('checkout.demoNotice')}</p>
        </aside>
      </form>
    </div>
  );
}
