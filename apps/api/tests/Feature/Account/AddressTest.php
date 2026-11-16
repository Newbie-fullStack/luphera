<?php

use App\Domain\Account\Models\Address;
use App\Domain\Commerce\Models\City;
use App\Models\User;
use Database\Seeders\CommerceSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(CommerceSeeder::class);
});

function addressPayload(array $overrides = []): array
{
    return array_merge([
        'label' => 'Maison',
        'recipient_name' => 'Salma Bennani',
        'phone' => '06 12 34 56 78',
        'city' => 'casablanca',
        'district' => 'Maarif',
        'address' => '12 rue des Orangers',
        'landmark' => 'En face de la pharmacie',
    ], $overrides);
}

it('requires a session for the address book', function (): void {
    $this->getJson('/api/v1/me/addresses')->assertUnauthorized();
});

it('creates the first address as the default one', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/addresses', addressPayload())
        ->assertCreated()
        ->assertJsonPath('data.phone', '+212612345678')
        ->assertJsonPath('data.city.slug', 'casablanca')
        ->assertJsonPath('data.is_default', true);
});

it('keeps a single default address', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/me/addresses', addressPayload())->assertCreated();

    $second = $this->postJson('/api/v1/me/addresses', addressPayload([
        'label' => 'Bureau',
        'district' => 'Gauthier',
        'is_default' => true,
    ]))->assertCreated();

    expect(Address::query()->where('user_id', $user->id)->where('is_default', true)->count())->toBe(1);
    expect($second->json('data.is_default'))->toBeTrue();
});

it('never exposes or edits the address of another customer', function (): void {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();

    $address = Address::query()->create([
        'user_id' => $owner->id,
        'recipient_name' => 'Salma Bennani',
        'phone' => '+212612345678',
        'city_id' => City::query()->where('slug', 'casablanca')->value('id'),
        'district' => 'Maarif',
        'line1' => '12 rue des Orangers',
        'is_default' => true,
    ]);

    Sanctum::actingAs($intruder);

    $this->getJson('/api/v1/me/addresses')->assertOk()->assertJsonCount(0, 'data');
    $this->patchJson('/api/v1/me/addresses/'.$address->public_id, ['label' => 'Piraté'])->assertNotFound();
    $this->deleteJson('/api/v1/me/addresses/'.$address->public_id)->assertNotFound();

    expect($address->refresh()->label)->toBeNull();
});

it('promotes another address when the default one is deleted', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $first = $this->postJson('/api/v1/me/addresses', addressPayload())->json('data.id');
    $this->postJson('/api/v1/me/addresses', addressPayload(['label' => 'Bureau', 'district' => 'Gauthier']))
        ->assertCreated();

    $this->deleteJson('/api/v1/me/addresses/'.$first)->assertOk();

    expect(Address::query()->where('user_id', $user->id)->where('is_default', true)->count())->toBe(1);
});

it('refuses an invalid phone or an unknown city', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/me/addresses', addressPayload(['phone' => '0102030405']))
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['fields' => ['phone']]]);

    $this->postJson('/api/v1/me/addresses', addressPayload(['city' => 'atlantide']))
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['fields' => ['city']]]);
});
