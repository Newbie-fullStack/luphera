<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('logs a staff member in with a session and returns their permissions', function (): void {
    $response = $this
        ->withHeader('Origin', 'http://localhost:5174')
        ->withHeader('Referer', 'http://localhost:5174/connexion')
        ->postJson('/api/v1/admin/login', [
            'identifier' => 'admin@luphera.test',
            'password' => 'password',
        ])->assertOk();

    $response
        ->assertJsonPath('data.roles.0', 'admin')
        ->assertJsonPath('data.email', 'admin@luphera.test');

    expect($response->json('data.permissions'))
        ->toContain('audit.view', 'catalog.manage', 'orders.confirm');

    $this->assertAuthenticated();

    $this->getJson('/api/v1/admin/me')
        ->assertOk()
        ->assertJsonPath('data.roles.0', 'admin');
});

it('refuses a customer account on the back-office login', function (): void {
    $customer = User::factory()->create(['phone' => '+212611111111']);
    $customer->assignRole('customer');

    $this->postJson('/api/v1/admin/login', [
        'identifier' => '+212611111111',
        'password' => 'password',
    ])
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');
});

it('rejects a wrong password with the same message as an unknown account', function (): void {
    $this->postJson('/api/v1/admin/login', [
        'identifier' => 'admin@luphera.test',
        'password' => 'wrong-password',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'invalid_credentials');

    $this->postJson('/api/v1/admin/login', [
        'identifier' => 'ghost@luphera.test',
        'password' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'invalid_credentials');
});

it('refuses a deactivated staff account', function (): void {
    $manager = User::factory()->inactive()->create();
    $manager->assignRole('manager');

    $this->postJson('/api/v1/admin/login', [
        'identifier' => $manager->phone,
        'password' => 'password',
    ])
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'account_disabled');
});

it('keeps the back-office closed to customers and visitors', function (): void {
    $this->getJson('/api/v1/admin/me')->assertUnauthorized();

    $customer = User::factory()->create();
    $customer->assignRole('customer');
    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/admin/me')
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');

    $this->getJson('/api/v1/admin/dashboard')
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');
});

it('logs the staff member out', function (): void {
    $this
        ->withHeader('Origin', 'http://localhost:5174')
        ->withHeader('Referer', 'http://localhost:5174/connexion')
        ->postJson('/api/v1/admin/login', [
            'identifier' => 'admin@luphera.test',
            'password' => 'password',
        ])->assertOk();

    $this->postJson('/api/v1/admin/logout')->assertOk();

    $this->assertGuest('web');
});
