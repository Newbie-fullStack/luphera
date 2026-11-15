<?php

use App\Domain\Catalog\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
