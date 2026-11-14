<?php

namespace App\Http\Resources\Catalog;

use App\Domain\Catalog\Models\Bundle;
use App\Domain\Catalog\Models\BundleItem;

/**
 * Editorial composition of a gift set.
 */
final class BundleResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Bundle $bundle): array
    {
        return [
            'id' => $bundle->public_id,
            'name' => $bundle->name,
            'product' => ProductSummaryResource::make($bundle->product),
            'items' => $bundle->items
                ->map(fn (BundleItem $item): array => [
                    'label' => $item->label,
                    'quantity' => $item->quantity,
                    'variant' => $item->variant === null ? null : [
                        'id' => $item->variant->public_id,
                        'size_ml' => $item->variant->size_ml,
                        'product' => [
                            'slug' => $item->variant->product->slug,
                            'name' => $item->variant->product->name,
                        ],
                    ],
                ])
                ->all(),
        ];
    }
}
