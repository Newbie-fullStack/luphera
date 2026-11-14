<?php

namespace App\Http\Resources\Catalog;

use App\Domain\Catalog\Enums\MediaType;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\ProductMedia;

/**
 * Card payload: enough for the shop grid, never a full product.
 */
final class ProductSummaryResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Product $product): array
    {
        $photo = $product->relationLoaded('media')
            ? $product->media->firstWhere('type', MediaType::Photo)
            : null;

        return [
            'id' => $product->public_id,
            'slug' => $product->slug,
            'name' => $product->name,
            'line' => $product->line->value,
            'family' => $product->family,
            'tag' => $product->tag,
            'short_description' => $product->short_description,
            'from_price_cents' => $product->from_price_cents,
            'variants_count' => $product->relationLoaded('variants') ? $product->variants->count() : null,
            'is_demo' => $product->is_demo,
            'image' => $photo instanceof ProductMedia ? [
                'url' => $photo->url,
                'alt' => $photo->alt,
            ] : null,
        ];
    }
}
