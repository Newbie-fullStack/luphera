<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Services\PricingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\ShippingQuoteRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ShippingController extends Controller
{
    public function __construct(private readonly PricingService $pricing) {}

    public function cities(): JsonResponse
    {
        $cities = City::query()
            ->where('is_active', true)
            ->orderBy('position')
            ->orderBy('name')
            ->get()
            ->map(fn (City $city): array => [
                'slug' => $city->slug,
                'name' => $city->name,
                'fee_cents' => $city->shipping_fee_cents,
                'delivery_days' => $city->delivery_days,
            ])
            ->all();

        return ApiResponse::data($cities);
    }

    /**
     * Delivery price for one city. Free above the shop threshold, exactly like
     * the cart and the order, so the checkout can never show another amount.
     */
    public function quote(ShippingQuoteRequest $request): JsonResponse
    {
        $city = $request->city();
        $threshold = $this->pricing->freeThresholdCents();
        $subtotal = $request->query('subtotal_cents');

        $fee = is_numeric($subtotal) && (int) $subtotal >= $threshold
            ? 0
            : $city->shipping_fee_cents;

        return ApiResponse::data([
            'city' => [
                'slug' => $city->slug,
                'name' => $city->name,
            ],
            'fee_cents' => $fee,
            'delivery_days' => $city->delivery_days,
            'free_threshold_cents' => $threshold,
            'flat_fee_cents' => $this->pricing->flatFeeCents(),
            'free_shipping' => $fee === 0,
        ]);
    }
}
