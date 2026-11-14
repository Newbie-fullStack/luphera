<?php

namespace App\Http\Resources\Catalog;

use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\ProductMedia;
use App\Domain\Catalog\Models\ProductVariant;

/**
 * Full product payload for the product page.
 */
final class ProductResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Product $product): array
    {
        return array_merge(ProductSummaryResource::make($product), [
            'description' => $product->description,
            'intensity' => $product->intensity,
            'longevity' => $product->longevity,
            'sillage' => $product->sillage,
            'season' => $product->season,
            'occasion' => $product->occasion,
            'seo' => [
                'title' => $product->seo_title,
                'description' => $product->seo_description,
            ],
            'variants' => $product->variants
                ->map(fn (ProductVariant $variant): array => VariantResource::make($variant))
                ->all(),
            'notes' => self::notes($product),
            'media' => $product->media
                ->map(fn (ProductMedia $media): array => [
                    'type' => $media->type->value,
                    'url' => $media->url,
                    'alt' => $media->alt,
                ])
                ->all(),
            'bundle' => $product->relationLoaded('bundle') && $product->bundle !== null
                ? BundleResource::make($product->bundle)
                : null,
        ]);
    }

    /**
     * Notes grouped by pyramid level, in insertion order.
     *
     * @return array{top: list<string>, heart: list<string>, base: list<string>}
     */
    private static function notes(Product $product): array
    {
        $grouped = [
            'top' => [],
            'heart' => [],
            'base' => [],
        ];

        foreach ($product->notes as $note) {
            $grouped[$note->level->value][] = $note->name;
        }

        return $grouped;
    }
}
