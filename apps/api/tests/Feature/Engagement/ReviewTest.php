<?php

use App\Domain\Catalog\Models\Product;
use App\Domain\Commerce\Models\Order;
use App\Domain\Commerce\Models\OrderItem;
use App\Domain\Engagement\Models\Review;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(CatalogSeeder::class);
});

function deliveredOrderWith(User $user, string $slug): Order
{
    $product = Product::query()->where('slug', $slug)->firstOrFail();
    $variant = $product->variants()->firstOrFail();

    $order = orderFor($user, ['status' => 'delivered']);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'product_slug' => $product->slug,
        'product_name' => $product->name,
        'variant_label' => $variant->label,
        'sku' => $variant->sku,
        'unit_price_cents' => $variant->price_cents,
        'quantity' => 1,
        'line_total_cents' => $variant->price_cents,
    ]);

    return $order;
}

function reviewFor(Product $product, User $user, array $overrides = []): Review
{
    return Review::query()->create(array_merge([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'rating' => 5,
        'title' => 'Sillage tenace',
        'body' => 'Un parfum qui tient toute la journée sans être écœurant.',
        'author_name' => 'Salma B.',
        'status' => Review::STATUS_APPROVED,
    ], $overrides));
}

it('lists only approved reviews with an average and a distribution', function (): void {
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    reviewFor($product, User::factory()->create(), ['rating' => 5]);
    reviewFor($product, User::factory()->create(), ['rating' => 4, 'author_name' => 'Youssef E.']);
    reviewFor($product, User::factory()->create(), ['status' => Review::STATUS_PENDING]);
    reviewFor($product, User::factory()->create(), ['status' => Review::STATUS_REJECTED]);

    $response = $this->getJson('/api/v1/products/luphera-noir/reviews')->assertOk();

    expect($response->json('data'))->toHaveCount(2)
        ->and($response->json('meta.count'))->toBe(2)
        ->and((float) $response->json('meta.average'))->toBe(4.5)
        ->and($response->json('meta.distribution.5'))->toBe(1)
        ->and($response->json('meta.distribution.4'))->toBe(1)
        ->and($response->json('meta.distribution.1'))->toBe(0);
});

it('answers 404 for an unknown product', function (): void {
    $this->getJson('/api/v1/products/inconnu/reviews')->assertNotFound();
});

it('requires a session to write a review', function (): void {
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    $this->postJson('/api/v1/me/reviews', [
        'product_id' => $product->public_id,
        'rating' => 5,
        'body' => 'Un très beau parfum, livré rapidement.',
    ])->assertUnauthorized();
});

it('refuses a review without a delivered order', function (): void {
    $user = User::factory()->create();
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/reviews', [
        'product_id' => $product->public_id,
        'rating' => 5,
        'body' => 'Un très beau parfum, livré rapidement.',
    ])
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'review_not_eligible');
});

it('stores a pending review after a delivery and keeps it off the storefront', function (): void {
    $user = User::factory()->create(['name' => 'Salma Bennani']);
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    deliveredOrderWith($user, 'luphera-noir');

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/reviews', [
        'product_id' => $product->public_id,
        'rating' => 5,
        'title' => 'Sillage tenace',
        'body' => 'Un très beau parfum, livré rapidement et bien emballé.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', Review::STATUS_PENDING)
        ->assertJsonPath('data.author', 'Salma B.');

    $this->getJson('/api/v1/products/luphera-noir/reviews')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('refuses a second review for the same product', function (): void {
    $user = User::factory()->create();
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    deliveredOrderWith($user, 'luphera-noir');
    reviewFor($product, $user, ['status' => Review::STATUS_PENDING]);

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/reviews', [
        'product_id' => $product->public_id,
        'rating' => 4,
        'body' => 'Deuxième avis qui ne devrait pas passer.',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'already_reviewed');
});

it('only accepts a product that is actually sold', function (): void {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/me/reviews', [
        'product_id' => '01HZZZZZZZZZZZZZZZZZZZZZZZ',
        'rating' => 5,
        'body' => 'Un très beau parfum, livré rapidement.',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');

    expect($response->json('errors.fields'))->toHaveKey('product_id');
});
