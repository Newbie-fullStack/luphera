<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Commerce\Models\Order;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * A customer only ever reads their own orders: the query is scoped by
 * user_id, so a guessed order number answers 404 instead of leaking data.
 */
class AccountOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->where('user_id', $this->user($request)->id)
            ->with(['items', 'events', 'shipments'])
            ->orderByDesc('placed_at')
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::data(
            $orders->getCollection()->map(fn (Order $order): array => OrderResource::make($order))->all(),
            [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        );
    }

    public function show(Request $request, string $number): JsonResponse
    {
        $order = Order::query()
            ->where('user_id', $this->user($request)->id)
            ->where('number', $number)
            ->with(['items', 'events', 'shipments'])
            ->first();

        if ($order === null) {
            return ApiResponse::error('Cette commande est introuvable.', [], 404, 'not_found');
        }

        return ApiResponse::data(OrderResource::make($order));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
