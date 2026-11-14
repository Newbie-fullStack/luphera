<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Catalog\Enums\MediaType;
use App\Domain\Catalog\Enums\ProductLine;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Queries\ProductIndexQuery;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ProductIndexRequest;
use App\Http\Resources\Catalog\ProductResource;
use App\Http\Resources\Catalog\ProductSummaryResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(ProductIndexRequest $request, ProductIndexQuery $query): JsonResponse
    {
        $result = $query($request->filters());
        $paginator = $result['products'];

        $items = $paginator->getCollection()
            ->map(fn (Product $product): array => ProductSummaryResource::make($product))
            ->all();

        return ApiResponse::data($items, [
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
            'per_page' => $paginator->perPage(),
            'total' => $result['total'],
            'facets' => $result['facets'],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->with([
                'variants',
                'notes',
                'media',
                'bundle.items.variant.product',
            ])
            ->firstOrFail();

        return ApiResponse::data(ProductResource::make($product));
    }

    public function related(string $slug): JsonResponse
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->firstOrFail();

        $related = Product::query()
            ->active()
            ->whereKeyNot($product->getKey())
            ->with([
                'variants',
                'media' => fn ($media) => $media->where('type', MediaType::Photo->value),
            ])
            ->orderByRaw(
                'CASE WHEN line = ? THEN 0 WHEN line = ? THEN 1 ELSE 2 END',
                [$product->line->value, ProductLine::Coffret->value],
            )
            ->orderBy('position')
            ->limit(3)
            ->get();

        return ApiResponse::data(
            $related
                ->map(fn (Product $item): array => ProductSummaryResource::make($item))
                ->all(),
            ['total' => $related->count()],
        );
    }
}
