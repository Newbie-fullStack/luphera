<?php

namespace App\Http\Resources\Catalog;

use App\Domain\Catalog\Models\ProductVariant;

/**
 * Public variant: a size, a price, a coarse availability. Never the exact stock.
 */
final class VariantResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(ProductVariant $variant): array
    {
        return [
            'id' => $variant->public_id,
            'sku' => $variant->sku,
            'label' => $variant->label ?? $variant->size_ml.' ml',
            'size_ml' => $variant->size_ml,
            'price_cents' => $variant->price_cents,
            'compare_at_price_cents' => $variant->compare_at_price_cents,
            'stock_status' => $variant->stockStatus(),
            'is_default' => $variant->is_default,
        ];
    }
}
