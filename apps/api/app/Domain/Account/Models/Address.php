<?php

namespace App\Domain\Account\Models;

use App\Domain\Commerce\Models\City;
use App\Models\Concerns\HasPublicId;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Saved delivery address. City, district and landmark mirror the checkout
 * fields so an address can be reused without conversion.
 */
class Address extends Model
{
    use HasPublicId;

    protected $fillable = [
        'user_id',
        'label',
        'recipient_name',
        'phone',
        'city_id',
        'district',
        'line1',
        'landmark',
        'is_default',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<City, $this> */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}
