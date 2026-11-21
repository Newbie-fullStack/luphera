<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Catalog\Models\Product;
use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Models\Order;
use App\Domain\Engagement\Models\Review;
use App\Http\Controllers\Controller;
use App\Http\Requests\Engagement\StoreReviewRequest;
use App\Http\Resources\Engagement\ReviewResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Customer reviews.
 *
 * Writing one requires a delivered order containing the product; reading the
 * list only ever returns approved reviews.
 */
class ReviewController extends Controller
{
    private const PER_PAGE = 10;

    public function index(string $slug): JsonResponse
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->firstOrFail();

        $reviews = Review::query()
            ->where('product_id', $product->getKey())
            ->where('status', Review::STATUS_APPROVED)
            ->latest()
            ->paginate(self::PER_PAGE);

        $counts = Review::query()
            ->where('product_id', $product->getKey())
            ->where('status', Review::STATUS_APPROVED)
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $total = (int) $counts->sum();
        $weighted = $counts->reduce(
            fn (int $carry, int|string $count, int|string $rating): int => $carry + ((int) $rating * (int) $count),
            0,
        );
        $average = $total === 0 ? null : round($weighted / $total, 1);

        return ApiResponse::data(
            $reviews->getCollection()
                ->map(fn (Review $review): array => ReviewResource::make($review))
                ->all(),
            [
                'average' => $average,
                'count' => $total,
                'distribution' => $this->distribution($counts),
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        );
    }

    public function store(StoreReviewRequest $request): JsonResponse
    {
        $user = $request->user();

        abort_if($user === null, 401);

        $product = Product::query()
            ->where('public_id', (string) $request->validated('product_id'))
            ->firstOrFail();

        $order = Order::query()
            ->where('user_id', $user->getKey())
            ->where('status', OrderStatus::Delivered)
            ->whereHas('items', fn ($query) => $query->where('product_slug', $product->slug))
            ->latest('placed_at')
            ->first();

        if ($order === null) {
            return ApiResponse::error(
                'Un avis ne peut être déposé qu’après la livraison du produit.',
                [],
                403,
                'review_not_eligible',
            );
        }

        if (Review::query()->where('product_id', $product->getKey())->where('user_id', $user->getKey())->exists()) {
            return ApiResponse::error(
                'Vous avez déjà donné votre avis sur ce produit.',
                [],
                422,
                'already_reviewed',
            );
        }

        $review = Review::query()->create([
            'product_id' => $product->getKey(),
            'user_id' => $user->getKey(),
            'order_id' => $order->getKey(),
            'rating' => (int) $request->validated('rating'),
            'title' => $request->validated('title'),
            'body' => (string) $request->validated('body'),
            'author_name' => self::displayName($user->name),
            'status' => Review::STATUS_PENDING,
        ]);

        return ApiResponse::data(ReviewResource::make($review, true), [], 201);
    }

    /**
     * "Salma Bennani" becomes "Salma B.": the storefront never shows a full
     * identity next to a review.
     */
    private static function displayName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $first = $parts[0] ?? $name;
        $last = count($parts) > 1 ? end($parts) : null;

        return $last === null || $last === '' || $last === $first
            ? $first
            : $first.' '.mb_strtoupper(mb_substr($last, 0, 1)).'.';
    }

    /**
     * @param Collection<int|string, int|string> $counts
     * @return array<int, int>
     */
    private function distribution(Collection $counts): array
    {
        $distribution = [];

        foreach ([5, 4, 3, 2, 1] as $rating) {
            $distribution[$rating] = (int) ($counts[$rating] ?? 0);
        }

        return $distribution;
    }
}
