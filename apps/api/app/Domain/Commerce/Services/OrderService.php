<?php

namespace App\Domain\Commerce\Services;

use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Enums\PaymentMethod;
use App\Domain\Commerce\Enums\PaymentStatus;
use App\Domain\Commerce\Enums\StockMovementReason;
use App\Domain\Commerce\Exceptions\BusinessRuleException;
use App\Domain\Commerce\Models\Cart;
use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Models\Coupon;
use App\Domain\Commerce\Models\Order;
use App\Domain\Commerce\Models\OrderEvent;
use App\Domain\Commerce\Models\Payment;
use App\Domain\Commerce\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Places orders and moves them through their lifecycle.
 *
 * Stock is decremented in the same transaction as the order, under a row lock,
 * so two simultaneous checkouts can never sell the same last bottle twice.
 */
final class OrderService
{
    public function __construct(private readonly PricingService $pricing) {}

    /**
     * @param array{
     *     customer_name: string,
     *     phone: string,
     *     email: ?string,
     *     city: City,
     *     district: string,
     *     line1: string,
     *     landmark: ?string,
     *     note: ?string
     * } $customer
     */
    public function place(Cart $cart, array $customer, ?string $idempotencyKey = null, ?User $user = null): Order
    {
        if ($idempotencyKey !== null) {
            $existing = Order::query()
                ->where('idempotency_key', $idempotencyKey)
                ->with(['items', 'events'])
                ->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        if ($cart->items->isEmpty()) {
            throw new BusinessRuleException('cart_empty', 'Votre panier est vide.');
        }

        try {
            return DB::transaction(function () use ($cart, $customer, $idempotencyKey, $user): Order {
                $items = $cart->items()->get();

                $variants = ProductVariant::query()
                    ->whereKey($items->pluck('product_variant_id')->all())
                    ->with('product')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $subtotal = 0;
                $lines = [];

                foreach ($items as $item) {
                    $variant = $variants->get($item->product_variant_id);

                    if ($variant === null) {
                        throw new BusinessRuleException(
                            'variant_not_found',
                            "Une contenance du panier n'est plus disponible.",
                        );
                    }

                    $product = $variant->product;

                    if ($variant->stock < $item->quantity) {
                        throw new BusinessRuleException(
                            'insufficient_stock',
                            'Il ne reste que '.$variant->stock.' pièce(s) pour '.$product->name.'.',
                            ['items' => ['Stock insuffisant pour '.$product->name.'.']],
                        );
                    }

                    $lineTotal = $variant->price_cents * $item->quantity;
                    $subtotal += $lineTotal;

                    $lines[] = [
                        'variant' => $variant,
                        'product' => $product,
                        'quantity' => $item->quantity,
                        'unit_price_cents' => $variant->price_cents,
                        'line_total_cents' => $lineTotal,
                    ];
                }

                $coupon = $this->lockCoupon($cart->coupon, $subtotal);
                $totals = $this->pricing->totals($subtotal, $coupon, $customer['city']);

                $order = Order::query()->create([
                    'number' => $this->nextNumber(),
                    'user_id' => $user?->getKey(),
                    'status' => OrderStatus::Pending,
                    'customer_name' => $customer['customer_name'],
                    'phone' => $customer['phone'],
                    'email' => $customer['email'],
                    'address' => [
                        'city' => $customer['city']->name,
                        'city_slug' => $customer['city']->slug,
                        'district' => $customer['district'],
                        'line1' => $customer['line1'],
                        'landmark' => $customer['landmark'],
                    ],
                    'note' => $customer['note'],
                    'subtotal_cents' => $totals['subtotal_cents'],
                    'discount_cents' => $totals['discount_cents'],
                    'shipping_cents' => $totals['shipping_cents'],
                    'total_cents' => $totals['total_cents'],
                    'coupon_code' => $coupon?->code,
                    'payment_method' => PaymentMethod::Cod,
                    'idempotency_key' => $idempotencyKey,
                    'tracking_token' => Str::random(40),
                    'placed_at' => now(),
                ]);

                foreach ($lines as $line) {
                    /** @var ProductVariant $variant */
                    $variant = $line['variant'];
                    $product = $line['product'];

                    $order->items()->create([
                        'product_variant_id' => $variant->getKey(),
                        'product_slug' => $product->slug,
                        'product_name' => $product->name,
                        'variant_label' => $variant->label,
                        'sku' => $variant->sku,
                        'unit_price_cents' => $line['unit_price_cents'],
                        'quantity' => $line['quantity'],
                        'line_total_cents' => $line['line_total_cents'],
                    ]);

                    $variant->decrement('stock', $line['quantity']);

                    StockMovement::query()->create([
                        'product_variant_id' => $variant->getKey(),
                        'order_id' => $order->getKey(),
                        'quantity' => -$line['quantity'],
                        'reason' => StockMovementReason::Order,
                        'author' => 'system',
                        'created_at' => now(),
                    ]);
                }

                Payment::query()->create([
                    'order_id' => $order->getKey(),
                    'method' => PaymentMethod::Cod,
                    'status' => PaymentStatus::Pending,
                    'amount_cents' => $order->total_cents,
                ]);

                OrderEvent::query()->create([
                    'order_id' => $order->getKey(),
                    'status' => OrderStatus::Pending,
                    'author' => 'client',
                    'comment' => null,
                    'created_at' => now(),
                ]);

                if ($coupon !== null) {
                    $coupon->increment('used_count');
                }

                $cart->items()->delete();
                $cart->coupon()->dissociate();
                $cart->save();

                return $order->load(['items', 'events']);
            });
        } catch (QueryException $exception) {
            if ($idempotencyKey !== null) {
                $existing = Order::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->with(['items', 'events'])
                    ->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            throw $exception;
        }
    }

    public function transition(Order $order, OrderStatus $target, ?string $author = null, ?string $comment = null): Order
    {
        if (! $order->status->canTransitionTo($target)) {
            throw new BusinessRuleException(
                'invalid_transition',
                'Cette transition de statut est impossible.',
                ['status' => ['Transition invalide.']],
            );
        }

        return DB::transaction(function () use ($order, $target, $author, $comment): Order {
            $order->update(['status' => $target]);
            $order->loadMissing('items');

            OrderEvent::query()->create([
                'order_id' => $order->getKey(),
                'status' => $target,
                'author' => $author,
                'comment' => $comment,
                'created_at' => now(),
            ]);

            if ($target->restoresStockOnEnter()) {
                $this->restoreStock($order);
            }

            return $order->load(['items', 'events']);
        });
    }

    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product_variant_id === null) {
                continue;
            }

            ProductVariant::query()
                ->whereKey($item->product_variant_id)
                ->increment('stock', $item->quantity);

            StockMovement::query()->create([
                'product_variant_id' => $item->product_variant_id,
                'order_id' => $order->getKey(),
                'quantity' => $item->quantity,
                'reason' => StockMovementReason::Return,
                'author' => 'system',
                'created_at' => now(),
            ]);
        }
    }

    private function lockCoupon(?Coupon $coupon, int $subtotal): ?Coupon
    {
        if ($coupon === null) {
            return null;
        }

        $locked = Coupon::query()->whereKey($coupon->getKey())->lockForUpdate()->first();

        if ($locked === null || ! $locked->isUsableAt() || ! $locked->meetsMinimum($subtotal)) {
            throw new BusinessRuleException(
                'coupon_unavailable',
                "Ce code promo n'est plus valable pour ce panier.",
                ['coupon' => ["Ce code promo n'est plus valable."]],
            );
        }

        return $locked;
    }

    private function nextNumber(): string
    {
        $prefix = 'LPH-'.now()->format('ymd').'-';

        do {
            $number = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (Order::query()->where('number', $number)->exists());

        return $number;
    }
}
