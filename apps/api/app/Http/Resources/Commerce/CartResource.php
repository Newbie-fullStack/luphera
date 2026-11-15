<?php

namespace App\Http\Resources\Commerce;

use App\Domain\Catalog\Enums\MediaType;
use App\Domain\Catalog\Models\ProductMedia;
use App\Domain\Commerce\Models\Cart;
use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Services\PricingService;

/**
 * Cart payload. Prices, discounts and shipping are computed from the database
 * on every read, never taken from the client.
 */
final class CartResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Cart $cart, ?City $city = null): array
    {
        $pricing = app(PricingService::class);
        $totals = $pricing->cartTotals($cart, $city);
        $afterDiscount = max(0, $totals['subtotal_cents'] - $totals['discount_cents']);
        $coupon = $cart->coupon;
        $couponApplies = $coupon !== null
            && $coupon->isUsableAt()
            && $coupon->meetsMinimum($totals['subtotal_cents']);

        return [
            'id' => $cart->public_id,
            'item_count' => (int) $cart->items->sum('quantity'),
            'items' => $cart->items
                ->map(fn ($item): array => [
                    'id' => $item->public_id,
                    'quantity' => $item->quantity,
                    'unit_price_cents' => $item->variant->price_cents,
                    'line_total_cents' => $item->variant->price_cents * $item->quantity,
                    'stock_status' => $item->variant->stockStatus(),
                    'max_quantity' => min(PricingService::MAX_LINE_QUANTITY, $item->variant->stock),
                    'variant' => [
                        'id' => $item->variant->public_id,
                        'label' => $item->variant->label,
                        'size_ml' => $item->variant->size_ml,
                    ],
                    'product' => [
                        'slug' => $item->variant->product->slug,
                        'name' => $item->variant->product->name,
                        'image' => self::image($item->variant->product->media->first(
                            fn (ProductMedia $media): bool => $media->type === MediaType::Photo,
                        )),
                    ],
                ])
                ->all(),
            'coupon' => $coupon === null ? null : [
                'code' => $coupon->code,
                'type' => $coupon->type->value,
                'value' => $coupon->value,
                'discount_cents' => $totals['discount_cents'],
                'applies' => $couponApplies,
            ],
            'totals' => $totals,
            'shipping' => $pricing->freeShippingProgress($afterDiscount),
            'city' => $city === null ? null : [
                'slug' => $city->slug,
                'name' => $city->name,
                'delivery_days' => $city->delivery_days,
            ],
            'currency' => 'MAD',
        ];
    }

    /**
     * @return array{url: string, alt: string}|null
     */
    private static function image(?ProductMedia $media): ?array
    {
        if ($media === null) {
            return null;
        }

        return ['url' => $media->url, 'alt' => $media->alt];
    }
}
