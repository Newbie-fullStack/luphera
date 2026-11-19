<?php

use App\Domain\Commerce\Models\StockMovement;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(CatalogSeeder::class);
});

it('adjusts the stock and writes an attributed movement', function (): void {
    $variant = variantBySku('LPH-NOIR-30');

    Sanctum::actingAs(staffUser('manager'));

    $this->postJson('/api/v1/admin/stock/adjust', [
        'variant_id' => $variant->public_id,
        'delta' => 6,
        'reason' => 'restock',
        'note' => 'Livraison fournisseur',
    ])
        ->assertOk()
        ->assertJsonPath('data.stock', 24)
        ->assertJsonPath('data.status', 'in_stock');

    $movement = StockMovement::query()->latest('id')->firstOrFail();

    expect($movement->quantity)->toBe(6)
        ->and($movement->reason->value)->toBe('restock')
        ->and($movement->note)->toBe('Livraison fournisseur')
        ->and($movement->author)->not->toBeNull();
});

it('refuses to push the stock below zero', function (): void {
    $variant = variantBySku('LPH-NOIR-30');

    Sanctum::actingAs(staffUser('manager'));

    $this->postJson('/api/v1/admin/stock/adjust', [
        'variant_id' => $variant->public_id,
        'delta' => -100,
        'reason' => 'adjust',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'invalid_stock');

    expect($variant->fresh()->stock)->toBe(18);
});

it('imports a CSV of target stocks and reports unknown SKUs', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $csv = "sku;stock\nLPH-NOIR-30;25\nLPH-GHOST-30;4\n";

    $this->post('/api/v1/admin/stock/import', [
        'file' => UploadedFile::fake()->createWithContent('stock.csv', $csv),
    ])
        ->assertOk()
        ->assertJsonPath('data.updated', 1)
        ->assertJsonPath('data.errors.0.line', 3);

    expect(variantBySku('LPH-NOIR-30')->stock)->toBe(25)
        ->and(StockMovement::query()->where('quantity', 7)->exists())->toBeTrue();
});

it('lists the variants needing a restock', function (): void {
    variantBySku('LPH-AMBRE-100')->forceFill(['stock' => 2, 'low_stock_threshold' => 5])->save();

    Sanctum::actingAs(staffUser('support'));

    $response = $this->getJson('/api/v1/admin/stock?low=1')->assertOk();

    expect($response->json('data.0.sku'))->toBe('LPH-AMBRE-100')
        ->and($response->json('data.0.status'))->toBe('low_stock');
});

it('shows the movement history for a variant', function (): void {
    $variant = variantBySku('LPH-NOIR-30');

    Sanctum::actingAs(staffUser('manager'));

    $this->postJson('/api/v1/admin/stock/adjust', [
        'variant_id' => $variant->public_id,
        'delta' => 2,
        'reason' => 'adjust',
    ])->assertOk();

    $this->getJson('/api/v1/admin/stock/movements?variant_id='.$variant->public_id)
        ->assertOk()
        ->assertJsonPath('data.0.sku', 'LPH-NOIR-30')
        ->assertJsonPath('data.0.quantity', 2);
});

it('exports the stock as a CSV file', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $csv = $this->get('/api/v1/admin/stock/export')->assertOk()->streamedContent();

    expect($csv)->toContain('sku;produit')
        ->and($csv)->toContain('LPH-NOIR-30');
});

it('keeps the stock console read-only for support', function (): void {
    Sanctum::actingAs(staffUser('support'));

    $this->postJson('/api/v1/admin/stock/adjust', [
        'variant_id' => variantBySku('LPH-NOIR-30')->public_id,
        'delta' => 1,
        'reason' => 'adjust',
    ])->assertForbidden();
});
