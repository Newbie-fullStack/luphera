<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Catalog\Enums\ProductLine;
use App\Domain\Catalog\Enums\ProductStatus;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\ProductMedia;
use App\Domain\Catalog\Models\ProductNote;
use App\Domain\Catalog\Models\ProductVariant;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminProductResource;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Catalogue editing. A product is never deleted: it moves to `archived`, so
 * past orders keep resolving their product page.
 */
class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'string', 'in:draft,active,archived'],
            'line' => ['nullable', 'string', 'in:homme,femme,coffret'],
        ]);

        $products = Product::query()
            ->with(['variants', 'media'])
            ->when(
                isset($validated['status']),
                fn (Builder $query): Builder => $query->where('status', $validated['status']),
            )
            ->when(
                isset($validated['line']),
                fn (Builder $query): Builder => $query->where('line', $validated['line']),
            )
            ->when(
                isset($validated['q']),
                function (Builder $query) use ($validated): Builder {
                    $term = '%'.trim((string) $validated['q']).'%';

                    return $query->where(fn (Builder $query): Builder => $query
                        ->where('name', 'like', $term)
                        ->orWhere('slug', 'like', $term)
                        ->orWhere('family', 'like', $term));
                },
            )
            ->orderBy('position')
            ->orderBy('id')
            ->paginate(20)
            ->withQueryString();

        return ApiResponse::data(
            $products->getCollection()->map(fn (Product $product): array => AdminProductResource::summary($product))->all(),
            [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        );
    }

    public function show(Product $product): JsonResponse
    {
        return ApiResponse::data(AdminProductResource::make($this->loaded($product)));
    }

    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $product = Product::query()->create($validated + [
            'slug' => $this->uniqueSlug((string) $validated['name']),
            'status' => ProductStatus::Draft,
            'is_demo' => true,
            'position' => (int) Product::query()->max('position') + 1,
        ]);

        $audit->log($request, 'product.created', $product, ['name' => $product->name], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product)), [], 201);
    }

    public function update(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->rules($product));

        $before = $product->only(['name', 'family', 'from_price_cents', 'status']);
        $product->fill($validated)->save();

        $audit->log(
            $request,
            'product.updated',
            $product,
            ['before' => $before, 'after' => $product->only(array_keys($validated))],
            $product->name,
        );

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())));
    }

    public function publish(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $product->forceFill([
            'status' => ProductStatus::Active,
            'published_at' => now(),
        ])->save();

        $audit->log($request, 'product.published', $product, [], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product)));
    }

    public function unpublish(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $product->forceFill([
            'status' => ProductStatus::Draft,
            'published_at' => null,
        ])->save();

        $audit->log($request, 'product.unpublished', $product, [], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product)));
    }

    public function archive(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $product->forceFill([
            'status' => ProductStatus::Archived,
            'published_at' => null,
        ])->save();

        $audit->log($request, 'product.archived', $product, [], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product)));
    }

    public function storeVariant(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->variantRules());

        $variant = DB::transaction(function () use ($product, $validated): ProductVariant {
            $variant = $product->variants()->create($validated + ['position' => $product->variants()->count()]);

            if ($variant->is_default) {
                $product->variants()->whereKeyNot($variant->getKey())->update(['is_default' => false]);
            }

            $this->syncFromPrice($product);

            return $variant;
        });

        $audit->log($request, 'variant.created', $product, ['sku' => $variant->sku], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())), [], 201);
    }

    public function updateVariant(Request $request, ProductVariant $variant, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->variantRules($variant));

        DB::transaction(function () use ($variant, $validated): void {
            $variant->fill($validated)->save();

            if ($variant->is_default) {
                $variant->product->variants()->whereKeyNot($variant->getKey())->update(['is_default' => false]);
            }

            $this->syncFromPrice($variant->product);
        });

        $audit->log($request, 'variant.updated', $variant->product, ['sku' => $variant->sku], $variant->product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($variant->product->refresh())));
    }

    public function destroyVariant(Request $request, ProductVariant $variant, AuditLogger $audit): JsonResponse
    {
        $product = $variant->product;
        $sku = $variant->sku;

        DB::transaction(function () use ($variant, $product): void {
            $variant->delete();
            $this->syncFromPrice($product);
        });

        $audit->log($request, 'variant.deleted', $product, ['sku' => $sku], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())));
    }

    public function storeMedia(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:photo,model3d'],
            'url' => ['required', 'string', 'max:500'],
            'alt' => ['required', 'string', 'max:200'],
        ]);

        $media = $product->media()->create([
            'type' => $validated['type'] ?? 'photo',
            'url' => $validated['url'],
            'alt' => $validated['alt'],
            'position' => $product->media()->count(),
        ]);

        $audit->log($request, 'media.created', $product, ['url' => $media->url], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())), [], 201);
    }

    public function updateMedia(Request $request, ProductMedia $media, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'alt' => ['sometimes', 'string', 'max:200'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);

        $media->fill($validated)->save();

        $product = $media->product;
        $audit->log($request, 'media.updated', $product, $validated, $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())));
    }

    public function destroyMedia(Request $request, ProductMedia $media, AuditLogger $audit): JsonResponse
    {
        $product = $media->product;
        $media->delete();

        $audit->log($request, 'media.deleted', $product, [], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())));
    }

    public function syncNotes(Request $request, Product $product, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'notes' => ['present', 'array', 'max:30'],
            'notes.*.level' => ['required', 'string', 'in:top,heart,base'],
            'notes.*.name' => ['required', 'string', 'max:80'],
        ]);

        DB::transaction(function () use ($product, $validated): void {
            $product->notes()->delete();

            foreach ($validated['notes'] as $index => $note) {
                ProductNote::query()->create([
                    'product_id' => $product->getKey(),
                    'level' => $note['level'],
                    'name' => $note['name'],
                    'position' => $index,
                ]);
            }
        });

        $audit->log($request, 'notes.updated', $product, [], $product->name);

        return ApiResponse::data(AdminProductResource::make($this->loaded($product->refresh())));
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?Product $product = null): array
    {
        $required = $product === null ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'min:2', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:120', 'alpha_dash', Rule::unique('products', 'slug')->ignore($product?->getKey())],
            'line' => [$required, 'string', Rule::enum(ProductLine::class)],
            'family' => [$required, 'string', 'min:2', 'max:64'],
            'tag' => ['nullable', 'string', 'max:32'],
            'short_description' => [$required, 'string', 'min:5', 'max:200'],
            'description' => [$required, 'string', 'min:20'],
            'intensity' => ['nullable', 'integer', 'between:0,5'],
            'longevity' => ['nullable', 'integer', 'between:0,5'],
            'sillage' => ['nullable', 'integer', 'between:0,5'],
            'season' => ['nullable', 'string', 'max:64'],
            'occasion' => ['nullable', 'string', 'max:64'],
            'seo_title' => ['nullable', 'string', 'max:190'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'is_demo' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function variantRules(?ProductVariant $variant = null): array
    {
        $required = $variant === null ? 'required' : 'sometimes';

        return [
            'sku' => [
                $required,
                'string',
                'max:64',
                Rule::unique('product_variants', 'sku')->ignore($variant?->getKey()),
            ],
            'label' => ['nullable', 'string', 'max:32'],
            'size_ml' => [$required, 'integer', 'between:1,1000'],
            'price_cents' => [$required, 'integer', 'min:0', 'max:100000000'],
            'compare_at_price_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'stock' => [$required, 'integer', 'min:0', 'max:100000'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    private function loaded(Product $product): Product
    {
        return $product->load(['variants', 'notes', 'media']);
    }

    private function syncFromPrice(Product $product): void
    {
        $product->forceFill([
            'from_price_cents' => (int) $product->variants()->min('price_cents'),
        ])->save();
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;

        while (Product::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
