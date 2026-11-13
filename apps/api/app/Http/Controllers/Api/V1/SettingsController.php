<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Public shop settings consumed by the storefront.
     *
     * Values come from config for now; from phase 1 they are read from the
     * `settings` table and cached in Redis.
     */
    public function __invoke(): JsonResponse
    {
        return ApiResponse::data([
            'brand' => [
                'name' => config('luphera.brand.name'),
                'tagline' => config('luphera.brand.tagline'),
                'whatsapp' => config('luphera.brand.whatsapp'),
                'email' => config('luphera.brand.email'),
            ],
            'currency' => [
                'code' => config('luphera.brand.currency'),
                'symbol' => 'MAD',
                'tax_included' => config('luphera.tax.included'),
            ],
            'shipping' => [
                'flat_fee_cents' => config('luphera.shipping.flat_fee_cents'),
                'free_threshold_cents' => config('luphera.shipping.free_threshold_cents'),
                'default_delay' => config('luphera.shipping.default_delay'),
            ],
            'seed' => true,
        ]);
    }
}
