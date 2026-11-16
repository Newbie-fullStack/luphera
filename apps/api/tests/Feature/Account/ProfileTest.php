<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('refuses the profile endpoints without a session', function (): void {
    $this->getJson('/api/v1/me')->assertUnauthorized();
    $this->patchJson('/api/v1/me', ['name' => 'Autre'])->assertUnauthorized();
});

it('returns the authenticated customer', function (): void {
    $user = User::factory()->create([
        'name' => 'Salma Bennani',
        'phone' => '+212612345678',
        'email' => 'salma@exemple.ma',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->public_id)
        ->assertJsonPath('data.name', 'Salma Bennani')
        ->assertJsonPath('data.email', 'salma@exemple.ma')
        ->assertJsonMissingPath('data.password');
});

it('updates the name, the email and the marketing choice', function (): void {
    $user = User::factory()->create(['email' => 'salma@exemple.ma']);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me', [
        'name' => 'Salma B.',
        'email' => 'Salma.B@Exemple.MA',
        'marketing_opt_in' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Salma B.')
        ->assertJsonPath('data.email', 'salma.b@exemple.ma')
        ->assertJsonPath('data.marketing_opt_in', true);
});

it('never changes the phone from the profile endpoint', function (): void {
    $user = User::factory()->create(['phone' => '+212612345678']);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me', [
        'name' => 'Salma B.',
        'phone' => '+212699999999',
    ])->assertOk();

    expect($user->refresh()->phone)->toBe('+212612345678');
});

it('refuses an email already used by another account', function (): void {
    User::factory()->create(['email' => 'autre@exemple.ma']);
    $user = User::factory()->create(['email' => 'salma@exemple.ma']);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me', ['email' => 'autre@exemple.ma'])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['fields' => ['email']]]);
});
