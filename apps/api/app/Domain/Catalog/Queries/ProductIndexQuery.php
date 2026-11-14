<?php

namespace App\Domain\Catalog\Queries;

use App\Domain\Catalog\Enums\MediaType;
use App\Domain\Catalog\Enums\ProductLine;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\ProductNote;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\CursorPaginator;

/**
 * Builds the storefront catalogue query.
 *
 * Phase 1 relies on indexed SQL (LIKE search, filtered columns). Meilisearch
 * takes over the relevance ranking in phase 6 without changing the response
 * shape, so the front never has to know which engine answered.
 */
final class ProductIndexQuery
{
    /**
     * @param array{line?: string|null, family?: string|null, notes?: list<string>, min_price?: int|null, max_price?: int|null, q?: string|null, sort?: string|null, per_page?: int|null} $filters
     * @return array{products: CursorPaginator<int, Product>, total: int, facets: array<string, mixed>}
     */
    public function __invoke(array $filters): array
    {
        $query = Product::query()
            ->active()
            ->with([
                'variants',
                'media' => fn ($media) => $media->where('type', MediaType::Photo->value),
            ]);

        $this->applyFilters($query, $filters);

        $total = (clone $query)->count();
        $perPage = min(max($filters['per_page'] ?? 12, 1), 24);

        [$column, $direction] = $this->sort($filters['sort'] ?? null);

        $products = $query
            ->orderBy($column, $direction)
            ->orderBy('id', $direction)
            ->cursorPaginate($perPage);

        return [
            'products' => $products,
            'total' => $total,
            'facets' => $this->facets(),
        ];
    }

    /**
     * @param Builder<Product> $query
     * @param array{line?: string|null, family?: string|null, notes?: list<string>, min_price?: int|null, max_price?: int|null, q?: string|null} $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['line'])) {
            $query->where('line', $filters['line']);
        }

        if (! empty($filters['family'])) {
            $query->where('family', $filters['family']);
        }

        foreach ($filters['notes'] ?? [] as $note) {
            $query->whereHas('notes', fn (Builder $notes) => $notes->where('name', $note));
        }

        if (isset($filters['min_price'])) {
            $query->where('from_price_cents', '>=', $filters['min_price']);
        }

        if (isset($filters['max_price'])) {
            $query->where('from_price_cents', '<=', $filters['max_price']);
        }

        $term = trim((string) ($filters['q'] ?? ''));

        if ($term !== '') {
            $like = '%'.addcslashes($term, '%_\\').'%';

            $query->where(function (Builder $search) use ($like): void {
                $search
                    ->where('name', 'like', $like)
                    ->orWhere('family', 'like', $like)
                    ->orWhere('tag', 'like', $like)
                    ->orWhere('short_description', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('notes', fn (Builder $notes) => $notes->where('name', 'like', $like));
            });
        }
    }

    /**
     * @return array{0: string, 1: 'asc'|'desc'}
     */
    private function sort(?string $sort): array
    {
        return match ($sort) {
            'prix-asc' => ['from_price_cents', 'asc'],
            'prix-desc' => ['from_price_cents', 'desc'],
            'nouveau' => ['created_at', 'desc'],
            default => ['position', 'asc'],
        };
    }

    /**
     * @return array{lines: list<string>, families: list<string>, notes: list<string>, price: array{min_cents: int, max_cents: int}}
     */
    private function facets(): array
    {
        $lines = Product::query()
            ->active()
            ->select('line')
            ->distinct()
            ->pluck('line')
            ->map(fn (mixed $line): string => $line instanceof ProductLine ? $line->value : (string) $line)
            ->values()
            ->all();

        return [
            'lines' => $lines,
            'families' => Product::query()
                ->active()
                ->select('family')
                ->distinct()
                ->orderBy('family')
                ->pluck('family')
                ->all(),
            'notes' => ProductNote::query()
                ->whereHas('product', fn (Builder $product) => $product->active())
                ->select('name')
                ->distinct()
                ->orderBy('name')
                ->pluck('name')
                ->all(),
            'price' => [
                'min_cents' => (int) Product::query()->active()->min('from_price_cents'),
                'max_cents' => (int) Product::query()->active()->max('from_price_cents'),
            ],
        ];
    }
}
