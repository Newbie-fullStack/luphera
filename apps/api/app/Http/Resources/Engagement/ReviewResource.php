<?php

namespace App\Http\Resources\Engagement;

use App\Domain\Engagement\Models\Review;

/**
 * Public review payload. The customer name is reduced to "Prénom N." before
 * it is stored, so the storefront never publishes a full identity.
 */
final class ReviewResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Review $review, bool $own = false): array
    {
        $payload = [
            'id' => $review->getKey(),
            'rating' => $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            'author' => $review->author_name,
            'created_at' => $review->created_at?->toIso8601String(),
        ];

        if ($own) {
            $payload['status'] = $review->status;
        }

        return $payload;
    }
}
