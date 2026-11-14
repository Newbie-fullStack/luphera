<?php

use App\Domain\Catalog\Models\Product;
use Database\Seeders\CatalogSeeder;

beforeEach(function (): void {
    $this->seed(CatalogSeeder::class);
});

it('lists the six demonstration products', function (): void {
    $response = $this->getJson('/api/v1/products');

    $response
        ->assertOk()
        ->assertJsonCount(6, 'data')
        ->assertJsonPath('meta.total', 6)
        ->assertJsonPath('meta.per_page', 12)
        ->assertJsonPath('meta.facets.price.min_cents', 39000)
        ->assertJsonPath('meta.facets.price.max_cents', 119000)
        ->assertJsonPath('errors', []);

    $first = $response->json('data.0');

    expect($first)
        ->toHaveKeys(['id', 'slug', 'name', 'line', 'family', 'from_price_cents', 'variants_count', 'image', 'is_demo'])
        ->and($first['id'])->toHaveLength(26)
        ->and($first['is_demo'])->toBeTrue()
        ->and($first['variants_count'])->toBe(3)
        ->and($first['image']['url'])->toStartWith('/images/flacons/');
});

it('filters by line', function (): void {
    $this->getJson('/api/v1/products?line=homme')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2);
});

it('filters by family and by note', function (): void {
    $this->getJson('/api/v1/products?family='.rawurlencode('Boisé cuiré'))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'luphera-noir');

    $this->getJson('/api/v1/products?notes[]='.rawurlencode('Cuir noir'))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'luphera-noir');
});

it('filters by price using integer centimes', function (): void {
    $this->getJson('/api/v1/products?max_price=45000')
        ->assertOk()
        ->assertJsonCount(5, 'data');

    $this->getJson('/api/v1/products?min_price=100000')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'coffret-duo');
});

it('searches names, families and notes', function (): void {
    $this->getJson('/api/v1/products?q=aurore')
        ->assertOk()
        ->assertJsonPath('meta.total', 3);

    $this->getJson('/api/v1/products?q=cuir')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'luphera-noir');
});

it('sorts by price and by novelty', function (): void {
    $this->getJson('/api/v1/products?sort=prix-asc')
        ->assertOk()
        ->assertJsonPath('data.0.slug', 'coffret-decouverte');

    $this->getJson('/api/v1/products?sort=prix-desc')
        ->assertOk()
        ->assertJsonPath('data.0.slug', 'coffret-duo');

    $this->getJson('/api/v1/products?sort=nouveau')
        ->assertOk()
        ->assertJsonPath('data.0.slug', 'coffret-decouverte');
});

it('paginates with a cursor', function (): void {
    $first = $this->getJson('/api/v1/products?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.per_page', 2);

    expect($first->json('meta.next_cursor'))->toBeString();

    $this->getJson('/api/v1/products?per_page=2&cursor='.urlencode((string) $first->json('meta.next_cursor')))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.prev_cursor', fn ($cursor): bool => is_string($cursor));
});

it('hides products that are not active', function (): void {
    Product::query()->where('slug', 'luphera-noir')->update(['status' => 'draft']);

    $this->getJson('/api/v1/products')
        ->assertOk()
        ->assertJsonPath('meta.total', 5);
});

it('rejects invalid filters with the error envelope', function (): void {
    $this->getJson('/api/v1/products?sort=inconnu')
        ->assertUnprocessable()
        ->assertJsonPath('data', null)
        ->assertJsonPath('errors.code', 'validation_error')
        ->assertJsonPath('errors.fields.sort.0', fn (string $message): bool => $message !== '');

    $this->getJson('/api/v1/products?q=a')
        ->assertUnprocessable()
        ->assertJsonStructure(['errors' => ['code', 'message', 'fields' => ['q']]]);
});

it('returns a full product with variants, notes and media', function (): void {
    $response = $this->getJson('/api/v1/products/luphera-noir')->assertOk();

    $response
        ->assertJsonPath('data.slug', 'luphera-noir')
        ->assertJsonPath('data.line', 'homme')
        ->assertJsonPath('data.intensity', 4)
        ->assertJsonPath('data.variants.1.label', '50 ml')
        ->assertJsonPath('data.variants.1.price_cents', 69000)
        ->assertJsonPath('data.variants.1.is_default', true)
        ->assertJsonCount(3, 'data.variants')
        ->assertJsonCount(3, 'data.notes.top')
        ->assertJsonCount(3, 'data.notes.heart')
        ->assertJsonCount(3, 'data.notes.base')
        ->assertJsonPath('data.notes.top.0', 'Bergamote')
        ->assertJsonPath('data.bundle', null)
        ->assertJsonPath('data.media.0.url', '/images/flacons/flacon-noir.webp');
});

it('returns the bundle composition for a gift set', function (): void {
    $this->getJson('/api/v1/products/coffret-duo')
        ->assertOk()
        ->assertJsonPath('data.line', 'coffret')
        ->assertJsonPath('data.variants.0.label', '2 × 50 ml')
        ->assertJsonCount(3, 'data.bundle.items')
        ->assertJsonPath('data.bundle.items.0.label', 'Luphéra Noir, 50 ml')
        ->assertJsonPath('data.bundle.items.0.variant.product.slug', 'luphera-noir');
});

it('never exposes the exact stock, only a stock status', function (): void {
    $variant = Product::query()->where('slug', 'luphera-noir')->firstOrFail()->variants()->firstOrFail();
    $variant->update(['stock' => 0]);

    $this->getJson('/api/v1/products/luphera-noir')
        ->assertOk()
        ->assertJsonPath('data.variants.0.stock_status', 'out_of_stock')
        ->assertJsonMissingPath('data.variants.0.stock');
});

it('returns three related products without the current one', function (): void {
    $response = $this->getJson('/api/v1/products/luphera-noir/related')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.slug', 'luphera-ambre');

    $slugs = array_column($response->json('data'), 'slug');

    expect($slugs)->not->toContain('luphera-noir');
});

it('lists the gift sets with their contents', function (): void {
    $this->getJson('/api/v1/bundles')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.product.slug', 'coffret-duo')
        ->assertJsonCount(3, 'data.0.items');
});

it('returns the not found envelope for an unknown slug', function (): void {
    $this->getJson('/api/v1/products/inconnu')
        ->assertNotFound()
        ->assertJsonPath('data', null)
        ->assertJsonPath('errors.code', 'not_found')
        ->assertJsonPath('errors.message', fn (string $message): bool => $message !== '');
});
