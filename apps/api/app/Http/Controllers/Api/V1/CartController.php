<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Commerce\Models\Cart;
use App\Domain\Commerce\Models\CartItem;
use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Services\CartService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\CartItemRequest;
use App\Http\Requests\Commerce\CartItemUpdateRequest;
use App\Http\Requests\Commerce\CouponRequest;
use App\Http\Resources\Commerce\CartResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $request->user());

        return $this->respond($cart, $this->city($request));
    }

    public function storeItem(CartItemRequest $request): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $request->user());
        $this->carts->addItem($cart, $request->variantId(), $request->quantity());

        return $this->respond($this->carts->load($cart));
    }

    public function updateItem(CartItemUpdateRequest $request, CartItem $item): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $request->user());

        abort_unless($item->cart_id === $cart->getKey(), 404);

        $this->carts->updateItem($item, $request->quantity());

        return $this->respond($this->carts->load($cart));
    }

    public function destroyItem(Request $request, CartItem $item): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $request->user());

        abort_unless($item->cart_id === $cart->getKey(), 404);

        $this->carts->removeItem($item);

        return $this->respond($this->carts->load($cart));
    }

    public function applyCoupon(CouponRequest $request): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $request->user());
        $this->carts->applyCoupon($cart, $request->code());

        return $this->respond($this->carts->load($cart));
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $cart = $this->carts->resolve($this->token($request), $request->user());
        $this->carts->removeCoupon($cart);

        return $this->respond($this->carts->load($cart));
    }

    private function respond(Cart $cart, ?City $city = null): JsonResponse
    {
        return ApiResponse::data(
            CartResource::make($cart, $city),
            ['cart_token' => $cart->public_id],
        )->withHeaders(['X-Cart-Token' => $cart->public_id]);
    }

    private function token(Request $request): ?string
    {
        $token = $request->header('X-Cart-Token');

        return is_string($token) && $token !== '' ? $token : null;
    }

    private function city(Request $request): ?City
    {
        $slug = $request->query('city');

        if (! is_string($slug) || $slug === '') {
            return null;
        }

        return City::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();
    }
}
