<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Account\Models\WishlistItem;
use App\Domain\Catalog\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\ProductSummaryResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $this->user($request)
            ->wishlistItems()
            ->with('product.media')
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::data(
            $items
                ->map(fn (WishlistItem $item): array => ProductSummaryResource::make($item->product))
                ->all(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'string', 'max:26'],
        ]);

        $product = Product::query()->where('public_id', $validated['product_id'])->first();

        if ($product === null) {
            return ApiResponse::error('Ce produit est introuvable.', [], 404, 'product_not_found');
        }

        $this->user($request)->wishlistItems()->firstOrCreate(['product_id' => $product->id]);

        return ApiResponse::data(ProductSummaryResource::make($product->load('media')), [], 201);
    }

    public function destroy(Request $request, string $product): JsonResponse
    {
        $productId = Product::query()->where('public_id', $product)->value('id');

        $deleted = $productId === null
            ? 0
            : $this->user($request)->wishlistItems()->where('product_id', $productId)->delete();

        if ($deleted === 0) {
            return ApiResponse::error('Ce favori est introuvable.', [], 404, 'not_found');
        }

        return ApiResponse::data(null);
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
