<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Commerce\Models\Setting;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Public shop settings consumed by the storefront.
     *
     * Values come from the `settings` table (edited in the back-office) with a
     * config fallback, so a fresh database still renders the shop.
     */
    public function __invoke(): JsonResponse
    {
        return ApiResponse::data([
            'brand' => [
                'name' => config('luphera.brand.name'),
                'tagline' => Setting::get('brand.tagline', config('luphera.brand.tagline')),
                'whatsapp' => Setting::get('brand.whatsapp', config('luphera.brand.whatsapp')),
                'email' => Setting::get('brand.email', config('luphera.brand.email')),
            ],
            'announcement' => [
                'active' => (bool) Setting::get('shop.announcement_active', '0'),
                'text' => Setting::get('shop.announcement', ''),
            ],
            'currency' => [
                'code' => config('luphera.brand.currency'),
                'symbol' => 'MAD',
                'tax_included' => config('luphera.tax.included'),
            ],
            'shipping' => [
                'flat_fee_cents' => Setting::getInt('shipping.flat_fee_cents', (int) config('luphera.shipping.flat_fee_cents')),
                'free_threshold_cents' => Setting::getInt('shipping.free_threshold_cents', (int) config('luphera.shipping.free_threshold_cents')),
                'default_delay' => config('luphera.shipping.default_delay'),
            ],
            'seed' => true,
        ]);
    }
}
