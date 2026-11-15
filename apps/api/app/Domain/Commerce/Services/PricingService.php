<?php

namespace App\Domain\Commerce\Services;

use App\Domain\Commerce\Models\Cart;
use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Models\Coupon;
use App\Domain\Commerce\Models\Setting;

/**
 * Single source of truth for money.
 *
 * Subtotal, discount, shipping and total are always recomputed here from the
 * database. The client never sends a price, and the same code path is used for
 * the cart display and for the order that is actually stored.
 */
final class PricingService
{
    public const MAX_LINE_QUANTITY = 10;

    public function freeThresholdCents(): int
    {
        return Setting::getInt(
            'shipping.free_threshold_cents',
            (int) config('luphera.shipping.free_threshold_cents'),
        );
    }

    public function flatFeeCents(): int
    {
        return Setting::getInt(
            'shipping.flat_fee_cents',
            (int) config('luphera.shipping.flat_fee_cents'),
        );
    }

    public function shippingCents(?City $city, int $subtotalAfterDiscount): int
    {
        if ($subtotalAfterDiscount >= $this->freeThresholdCents()) {
            return 0;
        }

        if ($city === null) {
            return $this->flatFeeCents();
        }

        return $city->shipping_fee_cents;
    }

    /**
     * @return array{
     *     subtotal_cents: int,
     *     discount_cents: int,
     *     shipping_cents: int,
     *     total_cents: int
     * }
     */
    public function totals(int $subtotalCents, ?Coupon $coupon, ?City $city): array
    {
        $discount = $coupon !== null
            && $coupon->isUsableAt()
            && $coupon->meetsMinimum($subtotalCents)
                ? $coupon->discountFor($subtotalCents)
                : 0;

        $afterDiscount = max(0, $subtotalCents - $discount);
        $shipping = $this->shippingCents($city, $afterDiscount);

        return [
            'subtotal_cents' => $subtotalCents,
            'discount_cents' => $discount,
            'shipping_cents' => $shipping,
            'total_cents' => $afterDiscount + $shipping,
        ];
    }

    public function cartSubtotalCents(Cart $cart): int
    {
        $subtotal = 0;

        foreach ($cart->items as $item) {
            $subtotal += $item->variant->price_cents * $item->quantity;
        }

        return $subtotal;
    }

    /**
     * @return array{
     *     subtotal_cents: int,
     *     discount_cents: int,
     *     shipping_cents: int,
     *     total_cents: int
     * }
     */
    public function cartTotals(Cart $cart, ?City $city = null): array
    {
        return $this->totals($this->cartSubtotalCents($cart), $cart->coupon, $city);
    }

    /**
     * @return array{free_threshold_cents: int, free_shipping: bool, remaining_cents: int}
     */
    public function freeShippingProgress(int $subtotalAfterDiscount): array
    {
        $threshold = $this->freeThresholdCents();

        return [
            'free_threshold_cents' => $threshold,
            'free_shipping' => $subtotalAfterDiscount >= $threshold,
            'remaining_cents' => max(0, $threshold - $subtotalAfterDiscount),
        ];
    }
}
