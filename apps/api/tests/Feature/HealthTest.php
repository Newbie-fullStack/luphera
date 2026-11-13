<?php

it('reports the API identity', function (): void {
    $this->getJson('/api/v1')
        ->assertOk()
        ->assertJsonPath('data.version', 'v1')
        ->assertJsonPath('errors', []);
});

it('reports a healthy service', function (): void {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJsonPath('data.status', 'ok')
        ->assertJsonPath('data.checks.database', true)
        ->assertJsonPath('data.checks.cache', true);
});

it('sets baseline security headers', function (): void {
    $response = $this->getJson('/api/v1/health');

    $response->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});

it('exposes the public shop settings', function (): void {
    $this->getJson('/api/v1/settings/public')
        ->assertOk()
        ->assertJsonPath('data.brand.name', 'Luphéra')
        ->assertJsonPath('data.currency.code', 'MAD')
        ->assertJsonPath('data.shipping.flat_fee_cents', 3500)
        ->assertJsonPath('data.shipping.free_threshold_cents', 80000);
});
