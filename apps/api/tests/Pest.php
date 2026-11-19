<?php

use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class)->in('Feature', 'Unit');

uses(RefreshDatabase::class)->in('Feature');

/**
 * Seed catalogue variant lookup, used by the commerce feature tests.
 */
function variantBySku(string $sku): ProductVariant
{
    return ProductVariant::query()->where('sku', $sku)->firstOrFail();
}

/**
 * Creates a fresh guest cart and returns its opaque token.
 */
function cartToken(TestCase $test): string
{
    return (string) $test->getJson('/api/v1/cart')->json('meta.cart_token');
}

/**
 * Adds a catalogue variant to a guest cart through the public API.
 */ function addToCart(TestCase $test, string $token, string $sku, int $quantity = 1): void
{
    $test->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku($sku)->public_id,
            'quantity' => $quantity,
        ])
        ->assertOk();
}

/**
 * Creates a staff account holding the given back-office role.
 */
function staffUser(string $role = 'admin'): User
{
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

/**
 * Valid checkout payload, in the shape the storefront sends.
 *
 * @param array<string, mixed> $overrides
 * @return array<string, mixed>
 */
function orderPayload(array $overrides = []): array
{
    return array_merge([
        'customer_name' => 'Salma Bennani',
        'phone' => '06 12 34 56 78',
        'city' => 'casablanca',
        'district' => 'Maarif',
        'address' => '12 rue des Orangers',
        'landmark' => 'En face de la pharmacie',
        'payment_method' => 'cod',
        'terms' => true,
    ], $overrides);
}

/**
 * Minimal order row for account tests: no cart, no stock movement.
 *
 * @param array<string, mixed> $overrides
 */
function orderFor(?User $user, array $overrides = []): Order
{
    static $sequence = 0;
    $sequence++;

    return Order::create(array_merge([
        'number' => 'LPH-261115-'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT),
        'user_id' => $user?->id,
        'status' => 'pending',
        'customer_name' => 'Salma Bennani',
        'phone' => $user?->phone ?? '+212612345678',
        'address' => [
            'city' => 'Casablanca',
            'city_slug' => 'casablanca',
            'district' => 'Maarif',
            'line1' => '12 rue des Orangers',
            'landmark' => null,
        ],
        'subtotal_cents' => 45000,
        'discount_cents' => 0,
        'shipping_cents' => 0,
        'total_cents' => 45000,
        'payment_method' => 'cod',
        'tracking_token' => Str::random(40),
        'placed_at' => now(),
    ], $overrides));
}
