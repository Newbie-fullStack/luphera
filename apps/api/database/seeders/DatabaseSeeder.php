<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Every record created here is demonstration data, never a claim about
     * the real catalogue or about real customers.
     *
     * Model events stay enabled on purpose: the `creating` hook of HasPublicId
     * is what fills the public ULID of every seeded record.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            CatalogSeeder::class,
            CommerceSeeder::class,
            ContentSeeder::class,
            DemoCustomerSeeder::class,
        ]);
    }
}
