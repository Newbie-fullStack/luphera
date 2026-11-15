import { useState, type FormEvent } from 'react';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button, ButtonLink } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ShippingProgress } from '@/components/ui/ShippingProgress';
import { Stepper } from '@/components/ui/Stepper';
import { ApiError } from '@/lib/api/client';
import { formatMAD } from '@/lib/format';

import { useCart } from '../useCart';

export function CartDrawer() {
  const { t } = useTranslation();
  const {
    cart,
    isLoading,
    isOpen,
    closeCart,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [code, setCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [pendingLine, setPendingLine] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const totals = cart?.totals ?? null;
  const afterDiscount = totals === null ? 0 : totals.subtotal_cents - totals.discount_cents;

  async function runLine(itemId: string, action: () => Promise<void>): Promise<void> {
    setPendingLine(itemId);
    setLineError(null);

    try {
      await action();
    } catch (error) {
      setLineError(error instanceof ApiError ? error.message : t('cart.error'));
    } finally {
      setPendingLine(null);
    }
  }

  async function submitCoupon(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (code.trim() === '' || couponPending) {
      return;
    }

    setCouponPending(true);
    setCouponError(null);

    try {
      await applyCoupon(code.trim());
      setCode('');
    } catch (error) {
      setCouponError(error instanceof ApiError ? error.message : t('cart.couponError'));
    } finally {
      setCouponPending(false);
    }
  }

  async function dropCoupon(): Promise<void> {
    setCouponPending(true);
    setCouponError(null);

    try {
      await removeCoupon();
    } catch (error) {
      setCouponError(error instanceof ApiError ? error.message : t('cart.couponError'));
    } finally {
      setCouponPending(false);
    }
  }

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title={t('cart.title')}
      closeLabel={t('common.close')}
      footer={
        items.length > 0 && totals !== null ? (
          <div className="grid gap-4">
            <dl className="grid gap-2 text-sm">
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
                <dt className="text-[11px] uppercase tracking-[.24em] text-brume">{t('cart.total')}</dt>
                <dd className="font-display text-xl text-ivoire">{formatMAD(totals.total_cents)}</dd>
              </div>
            </dl>

            <ButtonLink to="/commande" onClick={closeCart} className="w-full">
              {t('cart.checkout')}
            </ButtonLink>
            <p className="text-center text-[11px] leading-relaxed text-brume">{t('cart.checkoutHint')}</p>
          </div>
        ) : (
          <ButtonLink to="/boutique" onClick={closeCart} variant="secondary" className="w-full">
            {t('cart.continue')}
          </ButtonLink>
        )
      }
    >
      <p className="sr-only" role="status" aria-live="polite">
        {t('cart.announce', { count: cart?.item_count ?? 0 })}
      </p>

      {isLoading ? (
        <p className="py-10 text-center text-[11px] uppercase tracking-[.3em] text-brume">
          {t('cart.loading')}
        </p>
      ) : items.length === 0 ? (
        <div className="grid justify-items-center gap-4 py-16 text-center">
          <ShoppingBag size={28} className="text-or" aria-hidden="true" />
          <p className="font-display text-2xl text-ivoire">{t('cart.empty')}</p>
          <p className="max-w-[28ch] text-sm text-brume">{t('cart.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {cart !== null ? (
            <ShippingProgress
              subtotalCents={afterDiscount}
              thresholdCents={cart.shipping.free_threshold_cents}
              freeLabel={t('cart.freeShipping')}
              renderRemaining={(remaining) => (
                <>{t('cart.freeShippingRemaining', { amount: formatMAD(remaining) })}</>
              )}
              progressLabel={t('cart.freeShippingProgress')}
            />
          ) : null}

          <ul className="grid">
            {items.map((item) => {
              const busy = pendingLine === item.id;

              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-b border-ligne py-5 first:pt-0"
                >
                  <div className="grid h-24 place-items-center bg-charbon/60">
                    {item.product.image ? (
                      <img
                        src={item.product.image.url}
                        alt={item.product.image.alt}
                        width={40}
                        height={96}
                        loading="lazy"
                        decoding="async"
                        className="max-h-20 w-auto object-contain"
                      />
                    ) : (
                      <ShoppingBag size={20} className="text-brume" aria-hidden="true" />
                    )}
                  </div>

                  <div className="grid content-start gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <Link
                          to={`/produit/${item.product.slug}`}
                          onClick={closeCart}
                          className="text-[15px] leading-snug text-ivoire transition-colors hover:text-or-clair"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-[11px] uppercase tracking-[.2em] text-brume">
                          {item.variant.label}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm text-ivoire">
                        {formatMAD(item.line_total_cents)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Stepper
                        value={item.quantity}
                        min={1}
                        max={item.max_quantity}
                        decreaseLabel={t('cart.decrease')}
                        increaseLabel={t('cart.increase')}
                        onChange={(quantity) => {
                          if (quantity === item.quantity || busy) {
                            return;
                          }

                          void runLine(item.id, () => updateItem(item.id, quantity));
                        }}
                      />

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runLine(item.id, () => removeItem(item.id))}
                        aria-label={t('cart.remove', { name: item.product.name })}
                        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[.2em] text-brume transition-colors hover:text-or-clair disabled:opacity-50"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        {t('cart.remove', { name: item.product.name })}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {lineError !== null ? (
            <p role="alert" className="text-[12.5px] text-[#e0a2a2]">
              {lineError}
            </p>
          ) : null}

          <section aria-label={t('cart.couponLabel')} className="grid gap-3 border border-ligne p-4">
            {cart?.coupon ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ivoire">
                  {t('cart.couponApplied', { code: cart.coupon.code })}
                  <span className="ml-2 text-or-clair">−{formatMAD(cart.coupon.discount_cents)}</span>
                </p>
                <Button variant="secondary" onClick={() => void dropCoupon()} disabled={couponPending}>
                  {t('cart.couponRemove', { code: cart.coupon.code })}
                </Button>
              </div>
            ) : (
              <form onSubmit={(event) => void submitCoupon(event)} className="grid gap-3">
                <label htmlFor="cart-coupon" className="field-label">
                  {t('cart.couponLabel')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="cart-coupon"
                    name="code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t('cart.couponPlaceholder')}
                    autoComplete="off"
                    className="field-input min-w-0 flex-1"
                  />
                  <Button type="submit" disabled={couponPending || code.trim() === ''}>
                    {t('cart.couponApply')}
                  </Button>
                </div>
              </form>
            )}

            {couponError !== null ? (
              <p role="alert" className="field-error">
                {couponError}
              </p>
            ) : null}
          </section>

          {cart !== null ? (
            <p className="text-[11px] leading-relaxed text-brume">
              {cart.city
                ? t('cart.shippingCity', { city: cart.city.name, days: cart.city.delivery_days })
                : t('cart.shippingAtCheckout')}
            </p>
          ) : null}

          <p className="text-[10.5px] leading-relaxed text-brume/80">{t('cart.demoNotice')}</p>
        </div>
      )}
    </Drawer>
  );
}
