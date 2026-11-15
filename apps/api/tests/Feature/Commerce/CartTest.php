<?php

use App\Domain\Catalog\Models\Product;
use App\Domain\Commerce\Models\Cart;
use App\Domain\Commerce\Models\Coupon;
use App\Domain\Commerce\Models\Setting;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CommerceSeeder;

beforeEach(function (): void {
    $this->seed(CatalogSeeder::class);
    $this->seed(CommerceSeeder::class);
});

it('creates a guest cart and echoes its token', function (): void {
    $response = $this->getJson('/api/v1/cart')->assertOk();

    $response
        ->assertJsonPath('data.item_count', 0)
        ->assertJsonPath('data.items', [])
        ->assertJsonPath('data.totals.subtotal_cents', 0)
        ->assertJsonPath('errors', []);

    $token = $response->json('meta.cart_token');

    expect($token)->toBeString()->toHaveLength(26)
        ->and($response->headers->get('X-Cart-Token'))->toBe($token);
});

it('adds an item and computes the totals on the server', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 1,
            // A price sent by the client is ignored on purpose.
            'unit_price_cents' => 1,
            'total_cents' => 1,
        ])
        ->assertOk();

    $response
        ->assertJsonPath('data.item_count', 1)
        ->assertJsonPath('data.items.0.quantity', 1)
        ->assertJsonPath('data.items.0.unit_price_cents', 45000)
        ->assertJsonPath('data.items.0.line_total_cents', 45000)
        ->assertJsonPath('data.items.0.product.slug', 'luphera-noir')
        ->assertJsonPath('data.totals.subtotal_cents', 45000)
        ->assertJsonPath('data.totals.shipping_cents', 3500)
        ->assertJsonPath('data.totals.total_cents', 48500)
        ->assertJsonPath('data.shipping.remaining_cents', 35000)
        ->assertJsonPath('meta.cart_token', $token);
});

it('merges a repeated variant into a single line', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');
    $variantId = variantBySku('LPH-NOIR-30')->public_id;

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', ['variant_id' => $variantId, 'quantity' => 1])
        ->assertOk();

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', ['variant_id' => $variantId, 'quantity' => 2])
        ->assertOk()
        ->assertJsonPath('data.item_count', 3)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.totals.subtotal_cents', 135000);
});

it('offers shipping above the threshold', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 2,
        ])
        ->assertOk()
        ->assertJsonPath('data.totals.subtotal_cents', 90000)
        ->assertJsonPath('data.totals.shipping_cents', 0)
        ->assertJsonPath('data.shipping.free_shipping', true)
        ->assertJsonPath('data.shipping.remaining_cents', 0);
});

it('prices the shipping for a chosen city', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 1,
        ])
        ->assertOk();

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/v1/cart?city=casablanca')
        ->assertOk()
        ->assertJsonPath('data.city.slug', 'casablanca')
        ->assertJsonPath('data.totals.shipping_cents', 2500)
        ->assertJsonPath('data.totals.total_cents', 47500);
});

it('updates and removes a line', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $item = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 1,
        ])
        ->json('data.items.0.id');

    $this->withHeader('X-Cart-Token', $token)
        ->patchJson('/api/v1/cart/items/'.$item, ['quantity' => 3])
        ->assertOk()
        ->assertJsonPath('data.item_count', 3)
        ->assertJsonPath('data.totals.subtotal_cents', 135000);

    $this->withHeader('X-Cart-Token', $token)
        ->deleteJson('/api/v1/cart/items/'.$item)
        ->assertOk()
        ->assertJsonPath('data.item_count', 0)
        ->assertJsonCount(0, 'data.items');
});

it('refuses a line above the live stock', function (): void {
    variantBySku('LPH-NOIR-100')->update(['stock' => 1]);
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-100')->public_id,
            'quantity' => 2,
        ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'insufficient_stock')
        ->assertJsonPath('errors.fields.quantity.0', fn (string $message): bool => $message !== '');
});

it('refuses an unknown variant and a quantity above the line limit', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => (string) str()->ulid(),
            'quantity' => 1,
        ])
        ->assertNotFound()
        ->assertJsonPath('errors.code', 'variant_not_found');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 11,
        ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');
});

it('applies and removes the LUPHERA10 coupon', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 2,
        ])
        ->assertOk();

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'luphera10'])
        ->assertOk()
        ->assertJsonPath('data.coupon.code', 'LUPHERA10')
        ->assertJsonPath('data.coupon.discount_cents', 9000)
        ->assertJsonPath('data.totals.discount_cents', 9000)
        ->assertJsonPath('data.totals.total_cents', 81000);

    $this->withHeader('X-Cart-Token', $token)
        ->deleteJson('/api/v1/cart/coupon')
        ->assertOk()
        ->assertJsonPath('data.coupon', null)
        ->assertJsonPath('data.totals.total_cents', 90000);
});

it('refuses a coupon below its minimum and an unknown code', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 1,
        ])
        ->assertOk();

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'LUPHERA10'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'coupon_minimum');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'INCONNU'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'coupon_not_found');
});

it('refuses an expired or exhausted coupon', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 2,
        ])
        ->assertOk();

    Coupon::query()->where('code', 'LUPHERA10')->update(['ends_at' => now()->subDay()]);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'LUPHERA10'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'coupon_unavailable');

    Coupon::query()->where('code', 'LUPHERA10')->update(['ends_at' => null, 'max_uses' => 5, 'used_count' => 5]);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'LUPHERA10'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'coupon_unavailable');
});

it('keeps separate carts per token', function (): void {
    $first = $this->getJson('/api/v1/cart')->json('meta.cart_token');
    $second = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $first)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 1,
        ])
        ->assertOk();

    expect($first)->not->toBe($second)
        ->and(Cart::query()->count())->toBe(2);

    $this->withHeader('X-Cart-Token', $second)
        ->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.item_count', 0);
});

it('falls back to the configured threshold when no setting exists', function (): void {
    Setting::query()->where('key', 'shipping.free_threshold_cents')->delete();
    cache()->flush();

    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 2,
        ])
        ->assertOk()
        ->assertJsonPath('data.shipping.free_threshold_cents', 80000);
});

it('never exposes the exact stock in the cart', function (): void {
    $token = $this->getJson('/api/v1/cart')->json('meta.cart_token');

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/items', [
            'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
            'quantity' => 2,
        ])
        ->assertOk();

    expect($response->json('data.items.0'))->not->toHaveKey('stock');
    expect($response->json('data.items.0.stock_status'))->toBe('in_stock');
    expect(Product::query()->count())->toBe(6);
});
