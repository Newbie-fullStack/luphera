<?php

use App\Domain\Admin\Models\AuditLog;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('records every sensitive action in an append-only journal', function (): void {
    Sanctum::actingAs(staffUser('admin'));

    $this->postJson('/api/v1/admin/products', [
        'name' => 'Lupéra Nuit',
        'line' => 'homme',
        'family' => 'Ambré boisé',
        'short_description' => 'Un sillage de nuit.',
        'description' => 'Une composition de démonstration suffisamment longue.',
    ])->assertCreated();

    $log = AuditLog::query()->firstOrFail();

    expect($log->action)->toBe('product.created')
        ->and($log->subject_label)->toBe('Lupéra Nuit')
        ->and($log->user_id)->not->toBeNull()
        ->and($log->ip)->not->toBeNull();

    $this->getJson('/api/v1/admin/audit-logs')
        ->assertOk()
        ->assertJsonPath('data.0.action', 'product.created')
        ->assertJsonPath('data.0.subject_type', 'Product')
        ->assertJsonPath('data.0.author', fn (string $author): bool => $author !== '');

    $this->getJson('/api/v1/admin/audit-logs/actions')
        ->assertOk()
        ->assertJsonPath('data.0', 'product.created');
});

it('filters the journal by action and search term', function (): void {
    Sanctum::actingAs(staffUser('admin'));

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'PRINTEMPS',
        'type' => 'fixed',
        'value' => 5000,
    ])->assertCreated();

    $this->postJson('/api/v1/admin/products', [
        'name' => 'Lupéra Aurore',
        'line' => 'femme',
        'family' => 'Floral',
        'short_description' => 'Un sillage lumineux.',
        'description' => 'Une composition de démonstration suffisamment longue.',
    ])->assertCreated();

    expect($this->getJson('/api/v1/admin/audit-logs?action=coupon')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/v1/admin/audit-logs?q=Aurore')->json('meta.total'))->toBe(1);
});

it('keeps the journal out of reach for support', function (): void {
    Sanctum::actingAs(staffUser('support'));

    $this->getJson('/api/v1/admin/audit-logs')
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');
});
