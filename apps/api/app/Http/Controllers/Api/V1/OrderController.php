<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Commerce\Models\Order;
use App\Domain\Commerce\Services\CartService;
use App\Domain\Commerce\Services\OrderService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\OrderRequest;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly CartService $carts,
        private readonly OrderService $orders,
    ) {}

    public function store(OrderRequest $request): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $this->user($request));

        $order = $this->orders->place(
            $cart,
            [
                'customer_name' => (string) $request->validated('customer_name'),
                'phone' => (string) $request->validated('phone'),
                'email' => $request->validated('email'),
                'city' => $request->city(),
                'district' => (string) $request->validated('district'),
                'line1' => (string) $request->validated('address'),
                'landmark' => $request->validated('landmark'),
                'note' => $request->validated('note'),
            ],
            $this->idempotencyKey($request),
            $this->user($request),
        );

        return ApiResponse::data(
            OrderResource::make($order->loadMissing('shipments'), true),
            [],
            201,
        )->withHeaders(['X-Order-Number' => $order->number]);
    }

    public function show(Request $request, string $number): JsonResponse
    {
        $order = Order::query()
            ->where('number', $number)
            ->with(['items', 'events', 'shipments'])
            ->first();

        if ($order === null || ! $this->mayView($request, $order)) {
            return ApiResponse::error('Cette commande est introuvable.', [], 404, 'not_found');
        }

        return ApiResponse::data(OrderResource::make($order));
    }

    /**
     * A guest proves ownership with the tracking token, or with the phone used
     * at checkout. Both are rate-limited by the route middleware.
     */
    private function mayView(Request $request, Order $order): bool
    {
        $token = $request->query('token');
        $token = is_string($token) && $token !== '' ? $token : $request->header('X-Order-Token');

        if (is_string($token) && $token !== '' && hash_equals($order->tracking_token, $token)) {
            return true;
        }

        $phone = $request->query('phone');

        if (is_string($phone) && $phone !== '') {
            return hash_equals($order->phone, Phone::normalize($phone));
        }

        return false;
    }

    private function token(Request $request): ?string
    {
        $token = $request->header('X-Cart-Token');

        return is_string($token) && $token !== '' ? $token : null;
    }

    private function idempotencyKey(Request $request): ?string
    {
        $key = $request->header('Idempotency-Key');

        return is_string($key) && $key !== '' ? $key : null;
    }

    private function user(Request $request): ?User
    {
        $user = $request->user();

        return $user instanceof User ? $user : null;
    }
}
