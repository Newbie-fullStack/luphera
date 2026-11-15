<?php

namespace App\Domain\Commerce\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A delivery destination with its own fee and delay.
 */
class City extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'shipping_fee_cents',
        'delivery_days',
        'is_active',
        'position',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'shipping_fee_cents' => 'integer',
        'is_active' => 'boolean',
        'position' => 'integer',
    ];
}
