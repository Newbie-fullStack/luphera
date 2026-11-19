<?php

namespace App\Http\Resources\Admin;

use App\Domain\Commerce\Models\Order;
use App\Http\Resources\Commerce\OrderResource;

/**
 * Staff view of an order: the public payload plus the fields an operator
 * needs (item count, event authors, whether the order is still to confirm).
 */
final class AdminOrderResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Order $order): array
    {
        $payload = OrderResource::make($order);

        $payload['items_count'] = (int) $order->items->sum('quantity');
        $payload['needs_confirmation'] = $order->status->value === 'pending';
        $payload['events'] = $order->events
            ->sortBy('created_at')
            ->map(fn ($event): array => [
                'status' => $event->status->value,
                'at' => $event->created_at->toIso8601String(),
                'author' => $event->author,
                'comment' => $event->comment,
            ])
            ->values()
            ->all();

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Order $order): array
    {
        return [
            'number' => $order->number,
            'status' => $order->status->value,
            'placed_at' => $order->placed_at->toIso8601String(),
            'customer' => [
                'name' => $order->customer_name,
                'phone' => $order->phone,
            ],
            'city' => $order->address['city'] ?? null,
            'district' => $order->address['district'] ?? null,
            'items_count' => (int) $order->items->sum('quantity'),
            'total_cents' => $order->total_cents,
            'needs_confirmation' => $order->status->value === 'pending',
        ];
    }
}
