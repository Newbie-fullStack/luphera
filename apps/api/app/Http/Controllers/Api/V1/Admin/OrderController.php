<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Models\Order;
use App\Domain\Commerce\Services\OrderService;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Order work queue for the back-office.
 *
 * The queue is ordered by urgency: orders waiting for a confirmation call come
 * first, then the most recent. Every status change goes through
 * `OrderService::transition()` so the public history stays consistent.
 */
class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:'.implode(',', array_column(OrderStatus::cases(), 'value'))],
            'city' => ['nullable', 'string', 'max:64'],
            'q' => ['nullable', 'string', 'max:80'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'min_total' => ['nullable', 'integer', 'min:0'],
            'max_total' => ['nullable', 'integer', 'min:0'],
        ]);

        $orders = $this->filtered($validated)
            ->with('items')
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('placed_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return ApiResponse::data(
            $orders->getCollection()->map(fn (Order $order): array => AdminOrderResource::summary($order))->all(),
            [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        );
    }

    public function show(string $number): JsonResponse
    {
        $order = $this->find($number);

        return ApiResponse::data(AdminOrderResource::make($order));
    }

    public function transition(Request $request, string $number, OrderService $orders, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', array_column(OrderStatus::cases(), 'value'))],
            'comment' => ['nullable', 'string', 'max:500'],
            'carrier' => ['nullable', 'string', 'max:80'],
            'tracking_number' => ['nullable', 'string', 'max:80'],
        ]);

        $target = OrderStatus::from($validated['status']);

        // Support may confirm an order over the phone; every later step needs
        // the wider `orders.manage` right.
        $required = $target === OrderStatus::Confirmed ? 'orders.confirm' : 'orders.manage';

        if ($request->user()->can($required) !== true) {
            throw new AuthorizationException('Cette action demande un droit supplémentaire.');
        }

        $order = $this->find($number);
        $before = $order->status->value;

        $order = DB::transaction(function () use ($order, $target, $request, $validated, $orders): Order {
            $order = $orders->transition(
                $order,
                $target,
                $request->user()?->name,
                $validated['comment'] ?? null,
            );

            if (in_array($target, [OrderStatus::Shipped, OrderStatus::Delivered], true)) {
                $shipment = $order->shipments()->firstOrNew([]);

                $shipment->fill([
                    'carrier' => $validated['carrier'] ?? $shipment->carrier,
                    'tracking_number' => $validated['tracking_number'] ?? $shipment->tracking_number,
                    'status' => $target->value,
                    'shipped_at' => $shipment->shipped_at ?? ($target === OrderStatus::Shipped ? now() : null),
                    'delivered_at' => $target === OrderStatus::Delivered ? now() : $shipment->delivered_at,
                ])->save();
            }

            return $order;
        });

        $audit->log(
            $request,
            'order.status_changed',
            $order,
            [
                'from' => $before,
                'to' => $order->status->value,
                'comment' => $validated['comment'] ?? null,
                'carrier' => $validated['carrier'] ?? null,
                'tracking_number' => $validated['tracking_number'] ?? null,
            ],
            $order->number,
        );

        return ApiResponse::data(AdminOrderResource::make($order->load(['items', 'events', 'shipments'])));
    }

    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:'.implode(',', array_column(OrderStatus::cases(), 'value'))],
            'city' => ['nullable', 'string', 'max:64'],
            'q' => ['nullable', 'string', 'max:80'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'min_total' => ['nullable', 'integer', 'min:0'],
            'max_total' => ['nullable', 'integer', 'min:0'],
        ]);

        $filename = 'commandes-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($validated): void {
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, ['Numéro', 'Date', 'Statut', 'Client', 'Téléphone', 'Ville', 'Quartier', 'Articles', 'Total (MAD)'], ';');

            $this->filtered($validated)
                ->with('items')
                ->orderByDesc('placed_at')
                ->chunk(500, function ($orders) use ($out): void {
                    foreach ($orders as $order) {
                        fputcsv($out, [
                            $order->number,
                            $order->placed_at->format('d/m/Y H:i'),
                            $order->status->value,
                            $order->customer_name,
                            $order->phone,
                            $order->address['city'] ?? '',
                            $order->address['district'] ?? '',
                            (int) $order->items->sum('quantity'),
                            number_format($order->total_cents / 100, 2, ',', ''),
                        ], ';');
                    }
                });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function packingSlip(string $number): Response
    {
        $order = $this->find($number)->load('items');

        $pdf = Pdf::loadView('admin.packing-slip', [
            'order' => $order,
            'printedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download('bon-livraison-'.$order->number.'.pdf');
    }

    /**
     * @param array<string, mixed> $filters
     * @return Builder<Order>
     */
    private function filtered(array $filters): Builder
    {
        return Order::query()
            ->when(
                isset($filters['status']),
                fn (Builder $query): Builder => $query->where('status', $filters['status']),
            )
            ->when(
                isset($filters['city']),
                fn (Builder $query): Builder => $query->where('address->city_slug', $filters['city']),
            )
            ->when(
                isset($filters['q']),
                function (Builder $query) use ($filters): Builder {
                    $term = '%'.trim((string) $filters['q']).'%';

                    return $query->where(function (Builder $query) use ($term): void {
                        $query->where('number', 'like', $term)
                            ->orWhere('customer_name', 'like', $term)
                            ->orWhere('phone', 'like', $term);
                    });
                },
            )
            ->when(
                isset($filters['from']),
                fn (Builder $query): Builder => $query->where('placed_at', '>=', $filters['from'].' 00:00:00'),
            )
            ->when(
                isset($filters['to']),
                fn (Builder $query): Builder => $query->where('placed_at', '<=', $filters['to'].' 23:59:59'),
            )
            ->when(
                isset($filters['min_total']),
                fn (Builder $query): Builder => $query->where('total_cents', '>=', $filters['min_total']),
            )
            ->when(
                isset($filters['max_total']),
                fn (Builder $query): Builder => $query->where('total_cents', '<=', $filters['max_total']),
            );
    }

    private function find(string $number): Order
    {
        $order = Order::query()
            ->where('number', $number)
            ->with(['items', 'events', 'shipments'])
            ->first();

        abort_if($order === null, 404);

        return $order;
    }
}
