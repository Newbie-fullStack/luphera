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
            'messages.manage',
            'audit.view',
            'ai.use',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // syncPermissions() resolves names through the registrar cache, so it
        // must be flushed again after the permissions have been created.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $admin = Role::findOrCreate('admin', 'web');
        $manager = Role::findOrCreate('manager', 'web');
        $support = Role::findOrCreate('support', 'web');
        Role::findOrCreate('customer', 'web');

        $manager->syncPermissions([
            'catalog.view', 'catalog.manage',
            'orders.view', 'orders.manage', 'orders.confirm',
            'customers.view', 'marketing.manage', 'content.manage',
            'reviews.moderate', 'messages.view', 'messages.manage', 'ai.use',
        ]);

        $support->syncPermissions([
            'catalog.view',
            'orders.view', 'orders.confirm',
            'customers.view', 'messages.view', 'messages.manage', 'reviews.moderate',
        ]);

        $admin->syncPermissions($permissions);

        if (app()->environment('local', 'testing')) {
            $accounts = [
                ['phone' => '+212600000001', 'name' => 'Admin Luphéra', 'email' => 'admin@luphera.test', 'role' => $admin],
                ['phone' => '+212600000002', 'name' => 'Manager Luphéra', 'email' => 'manager@luphera.test', 'role' => $manager],
                ['phone' => '+212600000003', 'name' => 'Support Luphéra', 'email' => 'support@luphera.test', 'role' => $support],
            ];

            foreach ($accounts as $account) {
                User::query()->firstOrCreate(
                    ['phone' => $account['phone']],
                    [
                        'name' => $account['name'],
                        'email' => $account['email'],
                        'password' => 'password',
                        'phone_verified_at' => now(),
                    ],
                )->assignRole($account['role']);
            }
        }
    }
}
