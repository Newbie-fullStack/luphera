<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Commerce\Models\Setting;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * Editable shop settings. Only whitelisted keys are exposed: a settings table
 * that accepts arbitrary keys is an easy way to break the storefront.
 *
 * The API groups values by concern; the storage keys stay flat in the table.
 */
class SettingsController extends Controller
{
    /**
     * API path => storage key + default.
     *
     * Defaults mirror the config fallback used by the public endpoint: the
     * console must show what customers actually see, not an empty shell.
     *
     * @var array<string, array{key: string, default: string}>
     */
    private const FIELDS = [
        'brand.tagline' => ['key' => 'brand.tagline', 'default' => ''],
        'brand.whatsapp' => ['key' => 'brand.whatsapp', 'default' => ''],
        'brand.email' => ['key' => 'brand.email', 'default' => ''],
        'announcement.text' => ['key' => 'shop.announcement', 'default' => ''],
        'announcement.active' => ['key' => 'shop.announcement_active', 'default' => '0'],
        'shipping.flat_fee_cents' => ['key' => 'shipping.flat_fee_cents', 'default' => '0'],
        'shipping.free_threshold_cents' => ['key' => 'shipping.free_threshold_cents', 'default' => '0'],
    ];

    public function index(): JsonResponse
    {
        return ApiResponse::data([
            'brand' => [
                'tagline' => Setting::get('brand.tagline', (string) config('luphera.brand.tagline')),
                'whatsapp' => Setting::get('brand.whatsapp', (string) config('luphera.brand.whatsapp')),
                'email' => Setting::get('brand.email', (string) config('luphera.brand.email')),
            ],
            'announcement' => [
                'text' => Setting::get('shop.announcement', ''),
                'active' => (bool) Setting::get('shop.announcement_active', '0'),
            ],
            'shipping' => [
                'flat_fee_cents' => Setting::getInt('shipping.flat_fee_cents', (int) config('luphera.shipping.flat_fee_cents')),
                'free_threshold_cents' => Setting::getInt('shipping.free_threshold_cents', (int) config('luphera.shipping.free_threshold_cents')),
            ],
        ]);
    }

    public function update(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'brand' => ['sometimes', 'array'],
            'brand.tagline' => ['sometimes', 'nullable', 'string', 'max:120'],
            'brand.whatsapp' => ['sometimes', 'nullable', 'string', 'max:32'],
            'brand.email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'announcement' => ['sometimes', 'array'],
            'announcement.text' => ['sometimes', 'nullable', 'string', 'max:200'],
            'announcement.active' => ['sometimes', 'boolean'],
            'shipping' => ['sometimes', 'array'],
            'shipping.flat_fee_cents' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'shipping.free_threshold_cents' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
        ]);

        $changes = [];

        foreach (self::FIELDS as $path => $field) {
            if (! Arr::has($validated, $path)) {
                continue;
            }

            $value = data_get($validated, $path);
            $normalised = match (true) {
                $value === null => '',
                is_bool($value) => $value ? '1' : '0',
                default => (string) $value,
            };
            $before = $this->effective($path);

            if ($before === $normalised) {
                continue;
            }

            Setting::set($field['key'], $normalised);
            $changes[$field['key']] = ['before' => $before, 'after' => $normalised];
        }

        if ($changes !== []) {
            $audit->log($request, 'settings.updated', null, $changes);
        }

        return $this->index();
    }

    /**
     * Current effective value: stored value when present, config fallback
     * otherwise. Used for the audit "before" snapshot.
     */
    private function effective(string $path): string
    {
        $key = self::FIELDS[$path]['key'];

        return match ($path) {
            'brand.tagline' => Setting::get($key, (string) config('luphera.brand.tagline')),
            'brand.whatsapp' => Setting::get($key, (string) config('luphera.brand.whatsapp')),
            'brand.email' => Setting::get($key, (string) config('luphera.brand.email')),
            'shipping.flat_fee_cents' => Setting::get($key, (string) config('luphera.shipping.flat_fee_cents')),
            'shipping.free_threshold_cents' => Setting::get($key, (string) config('luphera.shipping.free_threshold_cents')),
            default => Setting::get($key, self::FIELDS[$path]['default']),
        };
    }
}
