<?php

namespace App\Http\Resources\Admin;

use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\ProductMedia;
use App\Domain\Catalog\Models\ProductNote;
use App\Domain\Catalog\Models\ProductVariant;

/**
 * Full catalogue payload for the editor: everything the storefront shows, plus
 * stock and the draft/published state.
 */
final class AdminProductResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Product $product): array
    {
        return [
            'id' => $product->public_id,
            'slug' => $product->slug,
            'name' => $product->name,
            'line' => $product->line->value,
            'family' => $product->family,
            'tag' => $product->tag,
            'short_description' => $product->short_description,
            'description' => $product->description,
            'status' => $product->status->value,
            'intensity' => $product->intensity,
            'longevity' => $product->longevity,
            'sillage' => $product->sillage,
            'season' => $product->season,
            'occasion' => $product->occasion,
            'from_price_cents' => $product->from_price_cents,
            'position' => $product->position,
            'is_demo' => $product->is_demo,
            'seo' => [
                'title' => $product->seo_title,
                'description' => $product->seo_description,
            ],
            'published_at' => $product->published_at?->toIso8601String(),
            'stock_total' => (int) $product->variants->sum('stock'),
            'variants' => $product->variants
                ->map(fn (ProductVariant $variant): array => [
                    'id' => $variant->public_id,
                    'sku' => $variant->sku,
                    'label' => $variant->label,
                    'size_ml' => $variant->size_ml,
                    'price_cents' => $variant->price_cents,
                    'compare_at_price_cents' => $variant->compare_at_price_cents,
                    'stock' => $variant->stock,
                    'low_stock_threshold' => $variant->low_stock_threshold,
                    'is_default' => $variant->is_default,
                ])
                ->values()
                ->all(),
            'notes' => $product->notes
                ->map(fn (ProductNote $note): array => [
                    'level' => $note->level->value,
                    'name' => $note->name,
                ])
                ->values()
                ->all(),
            'media' => $product->media
                ->map(fn (ProductMedia $media): array => [
                    'id' => $media->getKey(),
                    'type' => $media->type->value,
                    'url' => $media->url,
                    'alt' => $media->alt,
                    'position' => $media->position,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Product $product): array
    {
        $image = $product->media->first();

        return [
            'id' => $product->public_id,
            'slug' => $product->slug,
            'name' => $product->name,
            'line' => $product->line->value,
            'family' => $product->family,
            'status' => $product->status->value,
            'from_price_cents' => $product->from_price_cents,
            'stock_total' => (int) $product->variants->sum('stock'),
            'variants_count' => $product->variants->count(),
            'published_at' => $product->published_at?->toIso8601String(),
            'image' => $image === null ? null : ['url' => $image->url, 'alt' => $image->alt],
        ];
    }
}
