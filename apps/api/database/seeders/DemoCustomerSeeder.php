<?php

namespace Database\Seeders;

use App\Domain\Account\Models\Address;
use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Models\City;
use App\Domain\Commerce\Models\Order;
use App\Domain\Commerce\Models\OrderEvent;
use App\Domain\Commerce\Models\OrderItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demonstration shopper.
 *
 * Local and testing only: the customer console needs a real account with an
 * address and an order history to be readable, and the shipped order is what
 * makes the invoice and tracking screens demonstrable. Every value here is
 * demonstration data, never a claim about a real customer.
 */
class DemoCustomerSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            return;
        }

        $variant = ProductVariant::query()->where('sku', 'LPH-NOIR-50')->with('product')->first();

        if ($variant === null) {
            return;
        }

        $user = User::query()->firstOrCreate(
            ['phone' => '+212600000010'],
            [
                'name' => 'Salma Bennani',
                'email' => 'client@luphera.test',
                'password' => 'password',
                'phone_verified_at' => now(),
                'marketing_opt_in' => true,
            ],
        );

        if (! $user->hasRole('customer')) {
            $user->assignRole('customer');
        }

        $city = City::query()->where('slug', 'casablanca')->first();

        Address::query()->firstOrCreate(
            ['user_id' => $user->id, 'line1' => '12 rue des Orangers'],
            [
                'label' => 'Domicile',
                'recipient_name' => $user->name,
                'phone' => $user->phone,
                'city_id' => $city?->id,
                'district' => 'Maarif',
                'landmark' => 'En face de la pharmacie',
                'is_default' => true,
            ],
        );

        if (Order::query()->where('number', 'LPH-261114-0001')->exists()) {
            return;
        }

        $placedAt = now()->subDays(4);
        $subtotal = $variant->price_cents;
        $shipping = 2500;

        $order = Order::create([
            'number' => 'LPH-261114-0001',
            'user_id' => $user->id,
            'claimed_at' => $placedAt,
            'status' => 'delivered',
            'customer_name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'address' => [
                'city' => $city?->name ?? 'Casablanca',
                'city_slug' => $city?->slug ?? 'casablanca',
                'district' => 'Maarif',
                'line1' => '12 rue des Orangers',
                'landmark' => 'En face de la pharmacie',
            ],
            'subtotal_cents' => $subtotal,
            'discount_cents' => 0,
            'shipping_cents' => $shipping,
            'total_cents' => $subtotal + $shipping,
            'payment_method' => 'cod',
            'tracking_token' => Str::random(40),
            'placed_at' => $placedAt,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'product_slug' => $variant->product->slug,
            'product_name' => $variant->product->name,
            'variant_label' => $variant->label,
            'sku' => $variant->sku,
            'unit_price_cents' => $variant->price_cents,
            'quantity' => 1,
            'line_total_cents' => $variant->price_cents,
        ]);

        $history = [
            ['status' => 'pending', 'author' => 'client', 'offset' => 0],
            ['status' => 'confirmed', 'author' => 'Admin Luphéra', 'offset' => 3],
            ['status' => 'preparing', 'author' => 'Admin Luphéra', 'offset' => 20],
            ['status' => 'shipped', 'author' => 'Admin Luphéra', 'offset' => 26],
            ['status' => 'delivered', 'author' => 'Admin Luphéra', 'offset' => 52],
        ];

        foreach ($history as $event) {
            OrderEvent::create([
                'order_id' => $order->id,
                'status' => $event['status'],
                'author' => $event['author'],
                'comment' => null,
                'created_at' => $placedAt->copy()->addHours($event['offset']),
            ]);
        }
    }
}
