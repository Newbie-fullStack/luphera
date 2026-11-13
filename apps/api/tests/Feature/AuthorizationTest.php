<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('creates the four roles', function (): void {
    expect(Role::pluck('name')->all())
        ->toContain('admin', 'manager', 'support', 'customer');
});

it('gives the admin every permission', function (): void {
    $admin = User::where('phone', '+212600000001')->firstOrFail();

    expect($admin->hasRole('admin'))->toBeTrue()
        ->and($admin->can('settings.manage'))->toBeTrue()
        ->and($admin->can('catalog.manage'))->toBeTrue();
});

it('keeps support read-only on the catalogue', function (): void {
    $support = User::factory()->create();
    $support->assignRole('support');

    expect($support->can('catalog.view'))->toBeTrue()
        ->and($support->can('catalog.manage'))->toBeFalse()
        ->and($support->can('orders.confirm'))->toBeTrue()
        ->and($support->can('settings.manage'))->toBeFalse();
});

it('gives a manager catalogue and orders but not settings', function (): void {
    $manager = User::factory()->create();
    $manager->assignRole('manager');

    expect($manager->can('catalog.manage'))->toBeTrue()
        ->and($manager->can('orders.manage'))->toBeTrue()
        ->and($manager->can('settings.manage'))->toBeFalse();
});
