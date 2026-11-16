<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('registers a customer, normalises the phone and never returns the hash', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Salma Bennani',
        'phone' => '06 12 34 56 78',
        'email' => 'Salma@Exemple.MA',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ])->assertCreated();

    $response
        ->assertJsonPath('data.name', 'Salma Bennani')
        ->assertJsonPath('data.phone', '+212612345678')
        ->assertJsonPath('data.email', 'salma@exemple.ma')
        ->assertJsonPath('data.roles', ['customer'])
        ->assertJsonPath('errors', []);

    expect($response->json('data'))->not->toHaveKey('password');

    $user = User::query()->where('phone', '+212612345678')->firstOrFail();

    expect($user->hasRole('customer'))->toBeTrue();
    expect(Hash::check('secret123', $user->password))->toBeTrue();
});

it('refuses a phone that is already used, whatever its format', function (): void {
    User::factory()->create(['phone' => '+212612345678']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Salma Bennani',
        'phone' => '0612345678',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ])
        ->assertStatus(422)
        ->assertJsonPath('errors.code', 'validation_error')
        ->assertJsonStructure(['errors' => ['fields' => ['phone']]]);
});

it('logs in with a phone or an email', function (): void {
    User::factory()->create([
        'phone' => '+212612345678',
        'email' => 'salma@exemple.ma',
        'password' => 'secret123',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'identifier' => '06 12 34 56 78',
        'password' => 'secret123',
    ])
        ->assertOk()
        ->assertJsonPath('data.phone', '+212612345678');

    $this->postJson('/api/v1/auth/login', [
        'identifier' => 'SALMA@exemple.ma',
        'password' => 'secret123',
    ])
        ->assertOk()
        ->assertJsonPath('data.email', 'salma@exemple.ma');
});

it('refuses wrong credentials without saying which field failed', function (): void {
    User::factory()->create(['phone' => '+212612345678', 'password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', [
        'identifier' => '0612345678',
        'password' => 'wrong-password',
    ])
        ->assertStatus(422)
        ->assertJsonPath('errors.code', 'invalid_credentials')
        ->assertJsonStructure(['errors' => ['fields' => ['identifier']]]);
});

it('refuses a deactivated account', function (): void {
    User::factory()->inactive()->create(['phone' => '+212612345678', 'password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', [
        'identifier' => '0612345678',
        'password' => 'secret123',
    ])
        ->assertStatus(403)
        ->assertJsonPath('errors.code', 'account_disabled');
});

it('requires a session to log out', function (): void {
    $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
});

it('answers the same message when a reset is requested for an unknown address', function (): void {
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'inconnu@exemple.ma'])
        ->assertOk()
        ->assertJsonPath('data.message', 'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.');
});

it('resets the password with a valid token', function (): void {
    $user = User::factory()->create([
        'email' => 'salma@exemple.ma',
        'password' => 'old-password',
    ]);

    $token = Password::broker()->createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'salma@exemple.ma',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertOk();

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

it('refuses an invalid reset token', function (): void {
    User::factory()->create(['email' => 'salma@exemple.ma']);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'invalid-token',
        'email' => 'salma@exemple.ma',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['fields' => ['email']]]);
});
