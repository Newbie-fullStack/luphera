<?php

use App\Domain\Account\Models\WishlistItem;
use App\Domain\Catalog\Models\Product;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(CatalogSeeder::class);
});

it('requires a session for the wishlist', function (): void {
    $this->getJson('/api/v1/me/wishlist')->assertUnauthorized();
});

it('adds a product once and lists it as a card', function (): void {
    $user = User::factory()->create();
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/wishlist', ['product_id' => $product->public_id])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'luphera-noir');

    $this->postJson('/api/v1/me/wishlist', ['product_id' => $product->public_id])->assertCreated();

    expect(WishlistItem::query()->where('user_id', $user->id)->count())->toBe(1);

    $this->getJson('/api/v1/me/wishlist')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'luphera-noir')
        ->assertJsonStructure(['data' => [['id', 'name', 'from_price_cents', 'image']]]);
});

it('removes a favourite and answers 404 for an unknown one', function (): void {
    $user = User::factory()->create();
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/wishlist', ['product_id' => $product->public_id])->assertCreated();

    $this->deleteJson('/api/v1/me/wishlist/'.$product->public_id)->assertOk();
    $this->deleteJson('/api/v1/me/wishlist/'.$product->public_id)->assertNotFound();
});

it('never lists the favourites of another customer', function (): void {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    WishlistItem::query()->create(['user_id' => $owner->id, 'product_id' => $product->id]);

    Sanctum::actingAs($intruder);

    $this->getJson('/api/v1/me/wishlist')->assertOk()->assertJsonCount(0, 'data');
});

it('refuses an unknown product', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/me/wishlist', ['product_id' => '01HZZZZZZZZZZZZZZZZZZZZZZZ'])
        ->assertNotFound()
        ->assertJsonPath('errors.code', 'product_not_found');
});
