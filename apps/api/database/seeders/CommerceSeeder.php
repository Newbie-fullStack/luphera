<?php

namespace Database\Seeders;

use App\Domain\Commerce\Enums\CouponType;
use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Models\Coupon;
use App\Domain\Commerce\Models\Setting;
use Illuminate\Database\Seeder;

/**
 * Demonstration commerce settings.
 *
 * Fees, delays and the LUPHERA10 code are placeholders taken from the design
 * reference. They are seeded so the journey can be tested end to end; the real
 * rates will be entered from the admin once the carrier contract is signed.
 */
class CommerceSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->cities() as $position => $city) {
            City::query()->updateOrCreate(
                ['slug' => $city['slug']],
                [
                    'name' => $city['name'],
                    'shipping_fee_cents' => $city['fee'],
                    'delivery_days' => $city['days'],
                    'is_active' => true,
                    'position' => $position,
                ],
            );
        }

        Setting::set('shipping.free_threshold_cents', (string) config('luphera.shipping.free_threshold_cents'));
        Setting::set('shipping.flat_fee_cents', (string) config('luphera.shipping.flat_fee_cents'));

        Coupon::query()->updateOrCreate(
            ['code' => 'LUPHERA10'],
            [
                'type' => CouponType::Percentage,
                'value' => 10,
                'max_discount_cents' => 20000,
                'min_subtotal_cents' => 50000,
                'starts_at' => null,
                'ends_at' => null,
                'max_uses' => 500,
                'is_active' => true,
            ],
        );
    }

    /**
     * @return list<array{slug: string, name: string, fee: int, days: string}>
     */
    private function cities(): array
    {
        return [
            ['slug' => 'casablanca', 'name' => 'Casablanca', 'fee' => 2500, 'days' => '24 à 48 h'],
            ['slug' => 'rabat', 'name' => 'Rabat', 'fee' => 3000, 'days' => '24 à 48 h'],
            ['slug' => 'kenitra', 'name' => 'Kénitra', 'fee' => 3000, 'days' => '48 à 72 h'],
            ['slug' => 'marrakech', 'name' => 'Marrakech', 'fee' => 3500, 'days' => '48 à 72 h'],
            ['slug' => 'fes', 'name' => 'Fès', 'fee' => 3500, 'days' => '48 à 72 h'],
            ['slug' => 'meknes', 'name' => 'Meknès', 'fee' => 3500, 'days' => '48 à 72 h'],
            ['slug' => 'tanger', 'name' => 'Tanger', 'fee' => 3500, 'days' => '48 à 72 h'],
            ['slug' => 'agadir', 'name' => 'Agadir', 'fee' => 4000, 'days' => '48 à 72 h'],
            ['slug' => 'oujda', 'name' => 'Oujda', 'fee' => 4000, 'days' => '48 à 72 h'],
            ['slug' => 'tetouan', 'name' => 'Tétouan', 'fee' => 4000, 'days' => '48 à 72 h'],
        ];
    }
}
