<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function customerWithOrder(array $overrides = []): User
{
    $customer = User::factory()->create();
    $customer->assignRole('customer');
    orderFor($customer, $overrides);

    return $customer;
}

it('lists the customers with their spend and order count', function (): void {
    $salma = customerWithOrder(['total_cents' => 90000]);
    User::factory()->create()->assignRole('customer');

    Sanctum::actingAs(staffUser('support'));

    $response = $this->getJson('/api/v1/admin/customers')->assertOk();

    expect($response->json('meta.total'))->toBe(2)
        ->and($response->json('data.0.phone'))->not->toBeNull();

    $search = $this->getJson('/api/v1/admin/customers?q='.urlencode($salma->name))->assertOk();

    expect($search->json('data.0.id'))->toBe($salma->public_id)
        ->and($search->json('data.0.spent_cents'))->toBe(90000)
        ->and($search->json('data.0.orders_count'))->toBe(1);
});

it('shows the customer file with orders, notes and a segment', function (): void {
    $customer = customerWithOrder();

    Sanctum::actingAs(staffUser('manager'));

    $response = $this->getJson('/api/v1/admin/customers/'.$customer->public_id)->assertOk();

    $response
        ->assertJsonPath('data.name', $customer->name)
        ->assertJsonPath('data.orders.0.status', 'pending')
        ->assertJsonPath('data.segment', 'new');
});

it('adds an internal note that stays invisible to the customer', function (): void {
    $customer = customerWithOrder();

    Sanctum::actingAs(staffUser('support'));

    $this->postJson('/api/v1/admin/customers/'.$customer->public_id.'/notes', [
        'body' => 'Client demande un emballage cadeau.',
    ])->assertForbidden();

    Sanctum::actingAs(staffUser('admin'));

    $this->postJson('/api/v1/admin/customers/'.$customer->public_id.'/notes', [
        'body' => 'Client demande un emballage cadeau.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.author', fn (string $author): bool => $author !== '');

    $this->getJson('/api/v1/admin/customers/'.$customer->public_id)
        ->assertOk()
        ->assertJsonPath('data.notes.0.body', 'Client demande un emballage cadeau.');

    $this->getJson('/api/v1/me/notes')->assertNotFound();
});

it('deactivates a customer account', function (): void {
    $customer = customerWithOrder();

    Sanctum::actingAs(staffUser('admin'));

    $this->patchJson('/api/v1/admin/customers/'.$customer->public_id, ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect($customer->fresh()->is_active)->toBeFalse();
});

it('returns 404 for a foreign customer id', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $this->getJson('/api/v1/admin/customers/01HZZZZZZZZZZZZZZZZZZZZZZZ')->assertNotFound();
});
