<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Role matrix from the brief. `admin` bypasses every check through a
     * Gate::before hook in AppServiceProvider.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'catalog.view',
            'catalog.manage',
            'orders.view',
            'orders.manage',
            'orders.confirm',
            'customers.view',
            'customers.manage',
            'marketing.manage',
            'content.manage',
            'settings.manage',
            'reviews.moderate',
            'messages.view',
            'audit.view',
            'ai.use',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $admin = Role::findOrCreate('admin', 'web');
        $manager = Role::findOrCreate('manager', 'web');
        $support = Role::findOrCreate('support', 'web');
        Role::findOrCreate('customer', 'web');

        $manager->syncPermissions([
            'catalog.view', 'catalog.manage',
            'orders.view', 'orders.manage', 'orders.confirm',
            'customers.view', 'marketing.manage', 'content.manage',
            'reviews.moderate', 'messages.view', 'ai.use',
        ]);

        $support->syncPermissions([
            'catalog.view',
            'orders.view', 'orders.confirm',
            'customers.view', 'messages.view', 'reviews.moderate',
        ]);

        $admin->syncPermissions($permissions);

        if (app()->environment('local', 'testing')) {
            User::query()->firstOrCreate(
                ['phone' => '+212600000001'],
                [
                    'name' => 'Admin Luphéra',
                    'email' => 'admin@luphera.test',
                    'password' => 'password',
                    'phone_verified_at' => now(),
                ],
            )->assignRole($admin);
        }
    }
}
