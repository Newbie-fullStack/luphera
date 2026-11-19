<?php

use App\Domain\Admin\Models\AuditLog;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('puts the orders waiting for a confirmation call first', function (): void {
    orderFor(null, ['status' => 'shipped', 'placed_at' => now()]);
    orderFor(null, ['status' => 'pending', 'placed_at' => now()->subDay()]);

    Sanctum::actingAs(staffUser('support'));

    $response = $this->getJson('/api/v1/admin/orders')->assertOk();

    expect($response->json('data.0.status'))->toBe('pending')
        ->and($response->json('data.1.status'))->toBe('shipped')
        ->and($response->json('data.0.needs_confirmation'))->toBeTrue()
        ->and($response->json('meta.total'))->toBe(2);
});

it('filters the queue by status, city and search term', function (): void {
    orderFor(null, [
        'status' => 'pending',
        'customer_name' => 'Salma Bennani',
        'address' => ['city' => 'Casablanca', 'city_slug' => 'casablanca', 'district' => 'Maarif', 'line1' => 'Rue 1'],
    ]);
    orderFor(null, [
        'status' => 'delivered',
        'customer_name' => 'Youssef Alami',
        'address' => ['city' => 'Rabat', 'city_slug' => 'rabat', 'district' => 'Agdal', 'line1' => 'Rue 2'],
    ]);

    Sanctum::actingAs(staffUser('manager'));

    expect($this->getJson('/api/v1/admin/orders?status=delivered')->json('data.0.customer.name'))->toBe('Youssef Alami')
        ->and($this->getJson('/api/v1/admin/orders?city=rabat')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/v1/admin/orders?q=salma')->json('meta.total'))->toBe(1);
});

it('confirms an order as support then ships it as manager', function (): void {
    $order = orderFor(null);

    Sanctum::actingAs(staffUser('support'));

    $this->patchJson('/api/v1/admin/orders/'.$order->number.'/status', [
        'status' => 'confirmed',
        'comment' => 'Client joint par téléphone',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.needs_confirmation', false);

    $this->patchJson('/api/v1/admin/orders/'.$order->number.'/status', ['status' => 'preparing'])
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');

    Sanctum::actingAs(staffUser('manager'));

    $this->patchJson('/api/v1/admin/orders/'.$order->number.'/status', ['status' => 'preparing'])
        ->assertOk()
        ->assertJsonPath('data.status', 'preparing');

    $this->patchJson('/api/v1/admin/orders/'.$order->number.'/status', [
        'status' => 'shipped',
        'carrier' => 'Amana',
        'tracking_number' => 'AMN-123456',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'shipped');

    $order->refresh()->load('shipments');

    expect($order->status->value)->toBe('shipped')
        ->and($order->shipments)->toHaveCount(1)
        ->and($order->shipments->first()->carrier)->toBe('Amana')
        ->and($order->shipments->first()->tracking_number)->toBe('AMN-123456')
        ->and($order->shipments->first()->shipped_at)->not->toBeNull();

    expect(AuditLog::query()->where('action', 'order.status_changed')->count())->toBe(3)
        ->and(AuditLog::query()->where('subject_label', $order->number)->count())->toBe(3);
});

it('refuses an impossible transition with a business rule error', function (): void {
    $order = orderFor(null);

    Sanctum::actingAs(staffUser('manager'));

    $this->patchJson('/api/v1/admin/orders/'.$order->number.'/status', ['status' => 'delivered'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'invalid_transition');
});

it('returns 404 for an unknown order number', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $this->getJson('/api/v1/admin/orders/LPH-000000-0000')->assertNotFound();
});

it('exports the filtered queue as a CSV file', function (): void {
    orderFor(null, ['customer_name' => 'Salma Bennani']);
    orderFor(null, ['status' => 'delivered', 'customer_name' => 'Youssef Alami']);

    Sanctum::actingAs(staffUser('manager'));

    $response = $this->get('/api/v1/admin/orders/export?status=pending')->assertOk();

    $csv = $response->streamedContent();

    expect($csv)->toContain('Numéro')
        ->and($csv)->toContain('Salma Bennani')
        ->and($csv)->not->toContain('Youssef Alami');
});

it('prints a packing slip for the warehouse', function (): void {
    $order = orderFor(null);

    Sanctum::actingAs(staffUser('manager'));

    $response = $this->get('/api/v1/admin/orders/'.$order->number.'/packing-slip')->assertOk();

    expect($response->headers->get('content-type'))->toContain('pdf');
});

it('keeps the order queue closed to customers', function (): void {
    $customer = staffUser('customer');
    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/admin/orders')->assertForbidden();
});
