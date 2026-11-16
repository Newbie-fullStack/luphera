<?php

use App\Domain\Commerce\Models\Order;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CommerceSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('requires a session to read the account orders', function (): void {
    $this->getJson('/api/v1/me/orders')->assertUnauthorized();
});

it('shows only the orders of the authenticated customer', function (): void {
    $salma = User::factory()->create(['phone' => '+212612345678']);
    $autre = User::factory()->create(['phone' => '+212698765432']);

    $mine = orderFor($salma);
    $theirs = orderFor($autre);

    Sanctum::actingAs($salma);

    $response = $this->getJson('/api/v1/me/orders')->assertOk();

    expect($response->json('data.*.number'))->toBe([$mine->number]);
    expect($response->json('meta.total'))->toBe(1);

    $this->getJson('/api/v1/me/orders/'.$theirs->number)->assertNotFound();
    $this->getJson('/api/v1/me/orders/'.$mine->number)->assertOk();
});

it('claims the guest orders placed with the phone used at registration', function (): void {
    $this->seed(CatalogSeeder::class);
    $this->seed(CommerceSeeder::class);

    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30');

    $number = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated()
        ->json('data.number');

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Salma Bennani',
        'phone' => '06 12 34 56 78',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ])->assertCreated();

    $user = User::query()->where('phone', '+212612345678')->firstOrFail();
    $order = Order::query()->where('number', $number)->firstOrFail();

    expect($order->user_id)->toBe($user->id);
    expect($order->claimed_at)->not->toBeNull();

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/me/orders')
        ->assertOk()
        ->assertJsonPath('data.0.number', $number);
});

it('never claims the order of another customer', function (): void {
    $this->seed(CatalogSeeder::class);
    $this->seed(CommerceSeeder::class);

    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30');

    $number = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload(['phone' => '0698765432']))
        ->assertCreated()
        ->json('data.number');

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Salma Bennani',
        'phone' => '0612345678',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ])->assertCreated();

    expect(Order::query()->where('number', $number)->value('user_id'))->toBeNull();
});
