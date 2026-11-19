<?php

use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('aggregates the last thirty days for the dashboard', function (): void {
    $customer = User::factory()->create();
    $customer->assignRole('customer');

    orderFor($customer, [
        'status' => 'delivered',
        'total_cents' => 50000,
        'address' => ['city' => 'Casablanca', 'city_slug' => 'casablanca', 'district' => 'Maarif', 'line1' => 'Rue 1'],
        'placed_at' => now(),
    ]);

    orderFor(null, [
        'status' => 'pending',
        'total_cents' => 30000,
        'address' => ['city' => 'Rabat', 'city_slug' => 'rabat', 'district' => 'Agdal', 'line1' => 'Rue 2'],
        'placed_at' => now(),
    ]);

    orderFor(null, [
        'status' => 'cancelled',
        'total_cents' => 99900,
        'placed_at' => now(),
    ]);

    $support = staffUser('support');
    Sanctum::actingAs($support);

    $response = $this->getJson('/api/v1/admin/dashboard')->assertOk();

    expect($response->json('data.orders_30d'))->toBe(2)
        ->and($response->json('data.revenue_30d_cents'))->toBe(80000)
        ->and($response->json('data.average_basket_30d_cents'))->toBe(40000)
        ->and($response->json('data.confirmation_rate_30d'))->toBe(50)
        ->and($response->json('data.orders_pending'))->toBe(1)
        ->and($response->json('data.orders_today'))->toBe(3)
        ->and($response->json('data.customers_total'))->toBe(1)
        ->and($response->json('data.series'))->toHaveCount(30)
        ->and($response->json('data.sales_by_city.0.city'))->toBe('Casablanca');
});

it('lists the products that need a restock', function (): void {
    $this->seed(CatalogSeeder::class);

    $variant = variantBySku('LPH-NOIR-30');
    $variant->forceFill(['stock' => 1, 'low_stock_threshold' => 3])->save();

    Sanctum::actingAs(staffUser('manager'));

    $response = $this->getJson('/api/v1/admin/dashboard')->assertOk();

    expect($response->json('data.low_stock.0.sku'))->toBe('LPH-NOIR-30')
        ->and($response->json('data.low_stock.0.product.name'))->not->toBeNull();
});
