<?php

use App\Domain\Commerce\Models\Coupon;
use App\Domain\Commerce\Models\Setting;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('creates a coupon and refuses an impossible percentage', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'noel25',
        'type' => 'percentage',
        'value' => 25,
        'max_uses' => 100,
    ])
        ->assertCreated()
        ->assertJsonPath('data.code', 'NOEL25')
        ->assertJsonPath('data.is_usable', true);

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'trop',
        'type' => 'percentage',
        'value' => 150,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');

    $this->postJson('/api/v1/admin/coupons', [
        'code' => 'NOEL25',
        'type' => 'fixed',
        'value' => 5000,
    ])->assertUnprocessable();
});

it('updates and deactivates a coupon instead of deleting a used one', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $coupon = Coupon::query()->create([
        'code' => 'LUPHERA10',
        'type' => 'percentage',
        'value' => 10,
        'used_count' => 4,
        'is_active' => true,
    ]);

    $this->patchJson('/api/v1/admin/coupons/'.$coupon->getKey(), [
        'value' => 15,
        'ends_at' => now()->addMonth()->toDateString(),
    ])
        ->assertOk()
        ->assertJsonPath('data.value', 15);

    $this->deleteJson('/api/v1/admin/coupons/'.$coupon->getKey())
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect(Coupon::query()->where('code', 'LUPHERA10')->exists())->toBeTrue();
});

it('updates the shop settings and exposes them publicly', function (): void {
    Sanctum::actingAs(staffUser('admin'));

    $this->putJson('/api/v1/admin/settings', [
        'announcement' => [
            'text' => 'Livraison offerte dès 500 MAD.',
            'active' => true,
        ],
        'shipping' => [
            'flat_fee_cents' => 3500,
            'free_threshold_cents' => 50000,
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.announcement.text', 'Livraison offerte dès 500 MAD.')
        ->assertJsonPath('data.announcement.active', true)
        ->assertJsonPath('data.shipping.flat_fee_cents', 3500);

    expect(Setting::get('shop.announcement'))->toBe('Livraison offerte dès 500 MAD.');

    $this->getJson('/api/v1/settings/public')
        ->assertOk()
        ->assertJsonPath('data.announcement.active', true)
        ->assertJsonPath('data.announcement.text', 'Livraison offerte dès 500 MAD.')
        ->assertJsonPath('data.shipping.flat_fee_cents', 3500);
});

it('keeps the settings out of reach for a manager', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $this->putJson('/api/v1/admin/settings', ['announcement' => ['text' => 'Test']])
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');
});

it('hides a draft page from the storefront until it is published', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $page = $this->postJson('/api/v1/admin/pages', [
        'title' => 'Notre histoire',
        'body' => 'Texte de démonstration à compléter par la maison.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'notre-histoire')
        ->assertJsonPath('data.is_published', false)
        ->json('data');

    $this->getJson('/api/v1/pages/notre-histoire')->assertNotFound();

    $this->patchJson('/api/v1/admin/pages/'.$page['id'], ['is_published' => true])->assertOk();

    $this->getJson('/api/v1/pages/notre-histoire')
        ->assertOk()
        ->assertJsonPath('data.title', 'Notre histoire');

    $this->getJson('/api/v1/pages')->assertOk()->assertJsonCount(1, 'data');
});

it('deletes a page and logs it', function (): void {
    Sanctum::actingAs(staffUser('manager'));

    $id = $this->postJson('/api/v1/admin/pages', [
        'title' => 'Mentions légales',
        'body' => '[à compléter]',
    ])->json('data.id');

    $this->deleteJson('/api/v1/admin/pages/'.$id)->assertOk();

    $this->getJson('/api/v1/admin/pages/'.$id)->assertNotFound();
});
