<?php

use App\Domain\Catalog\Models\Product;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

/**
 * @return array<string, mixed>
 */
function productPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Lupéra Nuit',
        'line' => 'homme',
        'family' => 'Ambré boisé',
        'tag' => 'Nouveauté',
        'short_description' => 'Un sillage de nuit, dense et chaleureux.',
        'description' => 'Une composition de démonstration suffisamment longue pour la validation du formulaire.',
        'intensity' => 4,
        'longevity' => 4,
        'sillage' => 3,
        'season' => 'Hiver',
        'occasion' => 'Soirée',
        'seo_title' => 'Lupéra Nuit — parfum ambré',
        'seo_description' => 'Découvrez Lupéra Nuit, un parfum ambré boisé de démonstration.',
    ], $overrides);
}

it('lets a manager create a draft product and refuses support', function (): void {
    Sanctum::actingAs(staffUser('support'));

    $this->postJson('/api/v1/admin/products', productPayload())
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');

    Sanctum::actingAs(staffUser('manager'));

    $response = $this->postJson('/api/v1/admin/products', productPayload())->assertCreated();

    $response
        ->assertJsonPath('data.slug', 'lupera-nuit')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.is_demo', true);

    expect(Product::query()->where('slug', 'lupera-nuit')->exists())->toBeTrue();
});

it('validates the product form in French', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $this->postJson('/api/v1/admin/products', ['name' => 'X'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error')
        ->assertJsonPath('errors.fields.line.0', fn (string $message): bool => $message !== '')
        ->assertJsonPath('errors.fields.family.0', fn (string $message): bool => $message !== '')
        ->assertJsonPath('errors.fields.short_description.0', fn (string $message): bool => $message !== '')
        ->assertJsonPath('errors.fields.description.0', fn (string $message): bool => $message !== '');
});

it('keeps from_price in sync with the cheapest variant', function (): void {
    $this->seed(CatalogSeeder::class);

    Sanctum::actingAs(staffUser('manager'));

    $product = $this->postJson('/api/v1/admin/products', productPayload())->json('data');

    $this->postJson('/api/v1/admin/products/'.$product['id'].'/variants', [
        'sku' => 'LPH-NUIT-50',
        'label' => '50 ml',
        'size_ml' => 50,
        'price_cents' => 69000,
        'stock' => 10,
        'is_default' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('data.from_price_cents', 69000)
        ->assertJsonPath('data.stock_total', 10);

    $this->postJson('/api/v1/admin/products/'.$product['id'].'/variants', [
        'sku' => 'LPH-NUIT-30',
        'label' => '30 ml',
        'size_ml' => 30,
        'price_cents' => 45000,
        'stock' => 5,
    ])
        ->assertCreated()
        ->assertJsonPath('data.from_price_cents', 45000)
        ->assertJsonPath('data.stock_total', 15)
        ->assertJsonPath('data.variants.0.is_default', true)
        ->assertJsonPath('data.variants.1.is_default', false);

    $variantId = Product::query()->where('slug', 'lupera-nuit')->firstOrFail()
        ->variants()->where('sku', 'LPH-NUIT-30')->firstOrFail()->public_id;

    $this->patchJson('/api/v1/admin/variants/'.$variantId, ['price_cents' => 49000])
        ->assertOk()
        ->assertJsonPath('data.from_price_cents', 49000);
});

it('publishes, unpublishes and archives a product without deleting it', function (): void {
    $this->seed(CatalogSeeder::class);

    Sanctum::actingAs(staffUser('manager'));

    $id = $this->postJson('/api/v1/admin/products', productPayload())->json('data.id');

    $this->postJson('/api/v1/admin/products/'.$id.'/publish')
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect(Product::query()->where('slug', 'lupera-nuit')->firstOrFail()->published_at)->not->toBeNull();

    $this->postJson('/api/v1/admin/products/'.$id.'/unpublish')
        ->assertOk()
        ->assertJsonPath('data.status', 'draft');

    $this->deleteJson('/api/v1/admin/products/'.$id)
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');

    expect(Product::query()->where('slug', 'lupera-nuit')->exists())->toBeTrue();
});

it('replaces the olfactory notes and manages the media', function (): void {
    $this->seed(CatalogSeeder::class);

    Sanctum::actingAs(staffUser('manager'));

    $id = $this->postJson('/api/v1/admin/products', productPayload())->json('data.id');

    $this->putJson('/api/v1/admin/products/'.$id.'/notes', [
        'notes' => [
            ['level' => 'top', 'name' => 'Bergamote'],
            ['level' => 'heart', 'name' => 'Oud'],
            ['level' => 'base', 'name' => 'Ambre'],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.notes.1.name', 'Oud')
        ->assertJsonCount(3, 'data.notes');

    $this->postJson('/api/v1/admin/products/'.$id.'/media', [
        'url' => '/images/products/nuit.jpg',
        'alt' => 'Flacon Lupéra Nuit',
    ])
        ->assertCreated()
        ->assertJsonPath('data.media.0.alt', 'Flacon Lupéra Nuit');

    $mediaId = $this->getJson('/api/v1/admin/products/'.$id)->json('data.media.0.id');

    $this->patchJson('/api/v1/admin/media/'.$mediaId, ['alt' => 'Flacon ambré'])
        ->assertOk()
        ->assertJsonPath('data.media.0.alt', 'Flacon ambré');

    $this->deleteJson('/api/v1/admin/media/'.$mediaId)
        ->assertOk()
        ->assertJsonCount(0, 'data.media');
});

it('searches the catalogue by name and filters by line', function (): void {
    $this->seed(CatalogSeeder::class);

    Sanctum::actingAs(staffUser('support'));

    $response = $this->getJson('/api/v1/admin/products?line=homme')->assertOk();

    expect($response->json('meta.total'))->toBeGreaterThan(0)
        ->and($response->json('data.0.line'))->toBe('homme');

    $search = $this->getJson('/api/v1/admin/products?q=noir')->assertOk();

    expect($search->json('data.0.slug'))->toBe('luphera-noir');
});
