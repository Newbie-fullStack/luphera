<?php

namespace App\Http\Resources\Account;

use App\Domain\Account\Models\Address;
use App\Domain\Commerce\Models\City;

final class AddressResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Address $address): array
    {
        $city = $address->city;

        return [
            'id' => $address->public_id,
            'label' => $address->label,
            'recipient_name' => $address->recipient_name,
            'phone' => $address->phone,
            'city' => $city instanceof City ? [
                'slug' => $city->slug,
                'name' => $city->name,
                'delivery_days' => $city->delivery_days,
            ] : null,
            'district' => $address->district,
            'address' => $address->line1,
            'landmark' => $address->landmark,
            'is_default' => $address->is_default,
        ];
    }
}
