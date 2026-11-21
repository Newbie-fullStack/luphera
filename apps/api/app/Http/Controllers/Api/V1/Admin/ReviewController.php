<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Engagement\Models\Review;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Review moderation. An approved review is the only one the storefront can
 * read, so approving is a deliberate act and leaves an audit line.
 */
class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(Review::STATUSES)],
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $reviews = Review::query()
            ->with(['product:id,slug,name', 'moderator:id,name'])
            ->when(
                isset($validated['status']),
                fn (Builder $query): Builder => $query->where('status', $validated['status']),
            )
            ->when(
                isset($validated['q']),
                function (Builder $query) use ($validated): Builder {
                    $term = '%'.trim((string) $validated['q']).'%';

                    return $query->where(fn (Builder $query): Builder => $query
                        ->where('author_name', 'like', $term)
                        ->orWhere('title', 'like', $term)
                        ->orWhere('body', 'like', $term));
                },
            )
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return ApiResponse::data(
            $reviews->getCollection()
                ->map(fn (Review $review): array => $this->payload($review))
                ->all(),
            [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'pending_count' => Review::query()->where('status', Review::STATUS_PENDING)->count(),
            ],
        );
    }

    public function update(Request $request, Review $review, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([Review::STATUS_APPROVED, Review::STATUS_REJECTED])],
            'moderation_note' => ['nullable', 'string', 'max:255'],
        ]);

        $before = $review->status;

        $review->fill([
            'status' => $validated['status'],
            'moderation_note' => $validated['moderation_note'] ?? null,
            'moderated_by' => $request->user()?->getKey(),
            'moderated_at' => now(),
        ])->save();

        $audit->log($request, 'review.moderated', $review, [
            'status' => ['before' => $before, 'after' => $review->status],
        ], $review->author_name);

        return ApiResponse::data($this->payload($review->load(['product:id,slug,name', 'moderator:id,name'])));
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Review $review): array
    {
        return [
            'id' => $review->getKey(),
            'rating' => $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            'author' => $review->author_name,
            'status' => $review->status,
            'product' => $review->product === null
                ? null
                : [
                    'slug' => $review->product->slug,
                    'name' => $review->product->name,
                ],
            'moderator' => $review->moderator?->name,
            'moderation_note' => $review->moderation_note,
            'moderated_at' => $review->moderated_at?->toIso8601String(),
            'created_at' => $review->created_at?->toIso8601String(),
        ];
    }
}
