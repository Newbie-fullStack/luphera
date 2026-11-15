<?php

namespace App\Http\Resources\Commerce;

use App\Domain\Commerce\Models\Order;
use Carbon\Carbon;

/**
 * Public order payload. The tracking token is only included when the caller
 * proved ownership (right after checkout, or with a valid token/phone).
 */
final class OrderResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Order $order, bool $withTrackingToken = false): array
    {
        $shipment = $order->shipments->first();

        return [
            'number' => $order->number,
            'status' => $order->status->value,
            'placed_at' => self::iso($order->placed_at),
            'customer' => [
                'name' => $order->customer_name,
                'phone' => $order->phone,
                'email' => $order->email,
            ],
            'address' => $order->address,
            'note' => $order->note,
            'items' => $order->items
                ->map(fn ($item): array => [
                    'product_slug' => $item->product_slug,
                    'product_name' => $item->product_name,
                    'variant_label' => $item->variant_label,
                    'sku' => $item->sku,
                    'unit_price_cents' => $item->unit_price_cents,
                    'quantity' => $item->quantity,
                    'line_total_cents' => $item->line_total_cents,
                ])
                ->all(),
            'totals' => [
                'subtotal_cents' => $order->subtotal_cents,
                'discount_cents' => $order->discount_cents,
                'shipping_cents' => $order->shipping_cents,
                'total_cents' => $order->total_cents,
            ],
            'coupon_code' => $order->coupon_code,
            'payment_method' => $order->payment_method->value,
            'events' => $order->events
                ->sortBy('created_at')
                ->map(fn ($event): array => [
                    'status' => $event->status->value,
                    'at' => self::iso($event->created_at),
                    'comment' => $event->comment,
                ])
                ->values()
                ->all(),
            'shipment' => $shipment === null ? null : [
                'carrier' => $shipment->carrier,
                'tracking_number' => $shipment->tracking_number,
                'status' => $shipment->status,
                'shipped_at' => self::iso($shipment->shipped_at),
                'delivered_at' => self::iso($shipment->delivered_at),
            ],
            'tracking' => $withTrackingToken ? ['token' => $order->tracking_token] : null,
            'currency' => 'MAD',
        ];
    }

    /**
     * Nullable ISO 8601 timestamp: a shipment has no date before it moves.
     */
    private static function iso(?Carbon $moment): ?string
    {
        return $moment?->toIso8601String();
    }
}
