<?php

namespace App\Domain\Account\Services;

use App\Domain\Account\Models\Address;
use App\Domain\Commerce\Models\City;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Keeps the "exactly one default address" invariant, whichever mutation runs.
 */
final class AddressBook
{
    /**
     * @param array<string, mixed> $data
     */
    public function create(User $user, array $data): Address
    {
        return DB::transaction(function () use ($user, $data): Address {
            $isFirst = ! $user->addresses()->exists();
            $isDefault = (bool) ($data['is_default'] ?? false) || $isFirst;

            if ($isDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create([
                'label' => $data['label'] ?? null,
                'recipient_name' => $data['recipient_name'],
                'phone' => $data['phone'],
                'city_id' => $this->cityId((string) $data['city']),
                'district' => $data['district'],
                'line1' => $data['address'],
                'landmark' => $data['landmark'] ?? null,
                'is_default' => $isDefault,
            ]);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(Address $address, array $data): Address
    {
        return DB::transaction(function () use ($address, $data): Address {
            if (($data['is_default'] ?? false) === true) {
                $address->user()->firstOrFail()->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
            }

            $address->fill([
                'label' => array_key_exists('label', $data) ? $data['label'] : $address->label,
                'recipient_name' => $data['recipient_name'] ?? $address->recipient_name,
                'phone' => $data['phone'] ?? $address->phone,
                'district' => $data['district'] ?? $address->district,
                'line1' => $data['address'] ?? $address->line1,
                'landmark' => array_key_exists('landmark', $data) ? $data['landmark'] : $address->landmark,
                'is_default' => (bool) ($data['is_default'] ?? $address->is_default),
            ]);

            if (isset($data['city'])) {
                $address->city_id = $this->cityId((string) $data['city']);
            }

            $address->save();

            return $address->refresh();
        });
    }

    /**
     * Removing the default address promotes the most recent remaining one so
     * the checkout always has a usable default.
     */
    public function delete(Address $address): void
    {
        DB::transaction(function () use ($address): void {
            $wasDefault = $address->is_default;
            $user = $address->user()->first();

            $address->delete();

            if ($wasDefault && $user !== null) {
                $user->addresses()->orderByDesc('updated_at')->first()?->forceFill(['is_default' => true])->save();
            }
        });
    }

    private function cityId(string $slug): int
    {
        return (int) City::query()->where('slug', $slug)->where('is_active', true)->value('id');
    }
}
