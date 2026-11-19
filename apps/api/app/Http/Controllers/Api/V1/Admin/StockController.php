<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Enums\StockMovementReason;
use App\Domain\Commerce\Models\StockMovement;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Stock console: every change writes a movement, so an adjustment is never
 * anonymous. Import only accepts a known SKU and a non-negative target.
 */
class StockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'low' => ['nullable', 'boolean'],
        ]);

        $variants = ProductVariant::query()
            ->with('product')
            ->when(
                isset($validated['q']),
                function (Builder $query) use ($validated): Builder {
                    $term = '%'.trim((string) $validated['q']).'%';

                    return $query->where(fn (Builder $query): Builder => $query
                        ->where('sku', 'like', $term)
                        ->orWhereHas('product', fn (Builder $query): Builder => $query->where('name', 'like', $term)));
                },
            )
            ->when(
                filter_var($validated['low'] ?? false, FILTER_VALIDATE_BOOLEAN),
                fn (Builder $query): Builder => $query->whereColumn('stock', '<=', 'low_stock_threshold'),
            )
            ->orderBy('stock')
            ->orderBy('id')
            ->paginate(30)
            ->withQueryString();

        return ApiResponse::data(
            $variants->getCollection()
                ->map(fn (ProductVariant $variant): array => [
                    'id' => $variant->public_id,
                    'sku' => $variant->sku,
                    'label' => $variant->label,
                    'size_ml' => $variant->size_ml,
                    'stock' => $variant->stock,
                    'threshold' => $variant->low_stock_threshold,
                    'status' => $this->status($variant),
                    'product' => [
                        'slug' => $variant->product->slug,
                        'name' => $variant->product->name,
                    ],
                ])
                ->all(),
            [
                'current_page' => $variants->currentPage(),
                'last_page' => $variants->lastPage(),
                'per_page' => $variants->perPage(),
                'total' => $variants->total(),
            ],
        );
    }

    public function adjust(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'variant_id' => ['required', 'string', 'max:26'],
            'delta' => ['required', 'integer', 'not_in:0', 'between:-100000,100000'],
            'reason' => ['required', 'string', 'in:adjust,restock'],
            'note' => ['nullable', 'string', 'max:200'],
        ]);

        $variant = ProductVariant::query()
            ->with('product')
            ->where('public_id', $validated['variant_id'])
            ->first();

        if ($variant === null) {
            return ApiResponse::error('Cette variante est introuvable.', [], 404, 'variant_not_found');
        }

        if ($variant->stock + $validated['delta'] < 0) {
            return ApiResponse::error(
                'Le stock ne peut pas devenir négatif.',
                ['delta' => ['Le stock ne peut pas devenir négatif.']],
                422,
                'invalid_stock',
            );
        }

        DB::transaction(function () use ($variant, $validated, $request): void {
            $variant->increment('stock', $validated['delta']);

            StockMovement::query()->create([
                'product_variant_id' => $variant->getKey(),
                'order_id' => null,
                'quantity' => $validated['delta'],
                'reason' => StockMovementReason::from($validated['reason']),
                'author' => $request->user()->name,
                'note' => $validated['note'] ?? null,
                'created_at' => now(),
            ]);
        });

        $audit->log($request, 'stock.adjusted', $variant, [
            'sku' => $variant->sku,
            'delta' => $validated['delta'],
            'reason' => $validated['reason'],
            'note' => $validated['note'] ?? null,
        ], $variant->sku);

        return ApiResponse::data([
            'id' => $variant->public_id,
            'sku' => $variant->sku,
            'stock' => $variant->refresh()->stock,
            'status' => $this->status($variant),
        ]);
    }

    public function movements(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'variant_id' => ['nullable', 'string', 'max:26'],
        ]);

        $movements = StockMovement::query()
            ->with(['variant.product'])
            ->when(
                isset($validated['variant_id']),
                function (Builder $query) use ($validated): Builder {
                    $id = ProductVariant::query()->where('public_id', $validated['variant_id'])->value('id');

                    return $query->where('product_variant_id', $id ?? 0);
                },
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString();

        return ApiResponse::data(
            $movements->getCollection()
                ->map(fn (StockMovement $movement): array => [
                    'id' => $movement->getKey(),
                    'quantity' => $movement->quantity,
                    'reason' => $movement->reason->value,
                    'author' => $movement->author,
                    'note' => $movement->note,
                    'at' => $movement->created_at->toIso8601String(),
                    'sku' => $movement->variant?->sku,
                    'product' => $movement->variant->product->name,
                ])
                ->all(),
            [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
                'total' => $movements->total(),
            ],
        );
    }

    public function export(): StreamedResponse
    {
        return response()->streamDownload(function (): void {
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['sku', 'produit', 'contenance', 'stock', 'seuil'], ';');

            ProductVariant::query()
                ->with('product')
                ->orderBy('sku')
                ->chunk(500, function ($variants) use ($out): void {
                    foreach ($variants as $variant) {
                        fputcsv($out, [
                            $variant->sku,
                            $variant->product->name,
                            $variant->label,
                            $variant->stock,
                            $variant->low_stock_threshold,
                        ], ';');
                    }
                });

            fclose($out);
        }, 'stock-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request, AuditLogger $audit): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $handle = fopen($request->file('file')?->getRealPath() ?: '', 'rb');

        if ($handle === false) {
            return ApiResponse::error('Le fichier n’a pas pu être lu.', [], 422);
        }

        $updated = 0;
        $errors = [];
        $line = 0;

        DB::transaction(function () use ($handle, $request, $audit, &$updated, &$errors, &$line): void {
            while (($row = fgetcsv($handle, 1000, ';')) !== false) {
                $line++;

                if ($line === 1 && ! is_numeric($row[1] ?? null)) {
                    continue;
                }

                $sku = trim((string) ($row[0] ?? ''));
                $target = trim((string) ($row[1] ?? ''));

                if ($sku === '' || ! ctype_digit($target)) {
                    $errors[] = ['line' => $line, 'message' => 'SKU ou stock invalide.'];

                    continue;
                }

                $variant = ProductVariant::query()->where('sku', $sku)->first();

                if ($variant === null) {
                    $errors[] = ['line' => $line, 'message' => "SKU inconnu : {$sku}."];

                    continue;
                }

                $delta = (int) $target - $variant->stock;

                if ($delta === 0) {
                    continue;
                }

                $variant->increment('stock', $delta);

                StockMovement::query()->create([
                    'product_variant_id' => $variant->getKey(),
                    'order_id' => null,
                    'quantity' => $delta,
                    'reason' => StockMovementReason::Restock,
                    'author' => $request->user()->name,
                    'note' => 'Import CSV',
                    'created_at' => now(),
                ]);

                $updated++;
            }

            $audit->log($request, 'stock.imported', null, ['updated' => $updated, 'errors' => count($errors)]);
        });

        fclose($handle);

        return ApiResponse::data(['updated' => $updated, 'errors' => $errors]);
    }

    private function status(ProductVariant $variant): string
    {
        if ($variant->stock <= 0) {
            return 'out_of_stock';
        }

        return $variant->stock <= $variant->low_stock_threshold ? 'low_stock' : 'in_stock';
    }
}
