<?php

use App\Domain\Commerce\Models\City;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CommerceSeeder;

beforeEach(function (): void {
    $this->seed(CatalogSeeder::class);
    $this->seed(CommerceSeeder::class);
});

it('lists the active delivery cities', function (): void {
    $this->getJson('/api/v1/shipping/cities')
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('data.0.slug', 'casablanca')
        ->assertJsonPath('data.0.name', 'Casablanca')
        ->assertJsonPath('data.0.fee_cents', 2500)
        ->assertJsonPath('data.0.delivery_days', '24 à 48 h')
        ->assertJsonPath('errors', []);
});

it('hides an inactive city from the list', function (): void {
    City::query()->where('slug', 'agadir')->update(['is_active' => false]);

    $response = $this->getJson('/api/v1/shipping/cities')
        ->assertOk()
        ->assertJsonCount(9, 'data');

    expect(array_column($response->json('data'), 'slug'))->not->toContain('agadir');
});

it('quotes the fee of a city below the free threshold', function (): void {
    $this->getJson('/api/v1/shipping/quote?city=casablanca')
        ->assertOk()
        ->assertJsonPath('data.city.slug', 'casablanca')
        ->assertJsonPath('data.fee_cents', 2500)
        ->assertJsonPath('data.free_shipping', false)
        ->assertJsonPath('data.free_threshold_cents', 80000)
        ->assertJsonPath('data.flat_fee_cents', 3500);
});

it('offers the shipping above the free threshold', function (): void {
    $this->getJson('/api/v1/shipping/quote?city=marrakech&subtotal_cents=90000')
        ->assertOk()
        ->assertJsonPath('data.fee_cents', 0)
        ->assertJsonPath('data.free_shipping', true);
});

it('rejects an unknown or inactive city', function (): void {
    $this->getJson('/api/v1/shipping/quote?city=atlantide')
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error')
        ->assertJsonPath('errors.fields.city.0', fn (string $message): bool => $message !== '');

    City::query()->where('slug', 'fes')->update(['is_active' => false]);

    $this->getJson('/api/v1/shipping/quote?city=fes')
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');
});
