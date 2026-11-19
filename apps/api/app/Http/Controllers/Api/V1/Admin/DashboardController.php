<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Models\Order;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Read-only aggregates for the dashboard.
 *
 * The 30-day window is grouped in PHP rather than SQL so the same code runs on
 * SQLite (tests) and MySQL (production); the window is small enough that this
 * stays cheap, and the whole payload is cached for five minutes.
 */
class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        /** @var array<string, mixed> $payload */
        $payload = Cache::remember('admin.dashboard.v1', 300, fn (): array => $this->build());

        return ApiResponse::data($payload);
    }

    /**
     * @return array<string, mixed>
     */
    private function build(): array
    {
        $start = now()->subDays(29)->startOfDay();

        $orders = Order::query()
            ->where('placed_at', '>=', $start)
            ->get(['status', 'total_cents', 'address', 'placed_at']);

        $billable = $orders->reject(fn (Order $order): bool => $order->status === OrderStatus::Cancelled);

        $revenue = (int) $billable->sum('total_cents');
        $count = $billable->count();

        $confirmed = $billable
            ->filter(fn (Order $order): bool => in_array($order->status, [
                OrderStatus::Confirmed,
                OrderStatus::Preparing,
                OrderStatus::Shipped,
                OrderStatus::Delivered,
            ], true))
            ->count();

        $series = [];

        for ($day = 0; $day < 30; $day++) {
            $date = $start->copy()->addDays($day);
            $series[$date->toDateString()] = [
                'date' => $date->toDateString(),
                'orders' => 0,
                'revenue_cents' => 0,
            ];
        }

        $byCity = [];

        foreach ($billable as $order) {
            $key = $order->placed_at->toDateString();

            if (isset($series[$key])) {
                $series[$key]['orders']++;
                $series[$key]['revenue_cents'] += $order->total_cents;
            }

            $city = (string) ($order->address['city'] ?? '—');
            $byCity[$city] ??= ['city' => $city, 'orders' => 0, 'revenue_cents' => 0];
            $byCity[$city]['orders']++;
            $byCity[$city]['revenue_cents'] += $order->total_cents;
        }

        usort($byCity, fn (array $a, array $b): int => $b['revenue_cents'] <=> $a['revenue_cents']);

        return [
            'revenue_30d_cents' => $revenue,
            'orders_30d' => $count,
            'orders_today' => Order::query()->whereDate('placed_at', now()->toDateString())->count(),
            'orders_pending' => Order::query()->where('status', OrderStatus::Pending)->count(),
            'average_basket_30d_cents' => $count === 0 ? 0 : intdiv($revenue, $count),
            'confirmation_rate_30d' => $count === 0 ? 0 : (int) round($confirmed * 100 / $count),
            'customers_total' => User::query()->role('customer')->count(),
            'customers_new_30d' => User::query()->role('customer')->where('created_at', '>=', $start)->count(),
            'low_stock' => $this->lowStock(),
            'top_products' => $this->topProducts($start),
            'sales_by_city' => array_slice($byCity, 0, 6),
            'series' => array_values($series),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function lowStock(): array
    {
        return ProductVariant::query()
            ->with('product')
            ->whereColumn('stock', '<=', 'low_stock_threshold')
            ->orderBy('stock')
            ->limit(8)
            ->get()
            ->map(fn (ProductVariant $variant): array => [
                'id' => $variant->public_id,
                'sku' => $variant->sku,
                'label' => $variant->label,
                'stock' => $variant->stock,
                'threshold' => $variant->low_stock_threshold,
                'product' => [
                    'slug' => $variant->product->slug,
                    'name' => $variant->product->name,
                ],
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function topProducts(Carbon $start): array
    {
        return Order::query()
            ->where('placed_at', '>=', $start)
            ->where('status', '!=', OrderStatus::Cancelled)
            ->with('items')
            ->get()
            ->flatMap(fn (Order $order) => $order->items)
            ->groupBy('product_name')
            ->map(fn ($items, string $name): array => [
                'name' => $name,
                'quantity' => (int) $items->sum('quantity'),
                'revenue_cents' => (int) $items->sum('line_total_cents'),
            ])
            ->sortByDesc('quantity')
            ->take(5)
            ->values()
            ->all();
    }
}
