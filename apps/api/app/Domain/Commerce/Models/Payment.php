<?php

namespace App\Domain\Commerce\Models;

use App\Domain\Commerce\Enums\PaymentMethod;
use App\Domain\Commerce\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Payment attempt. Cash on delivery is recorded as a pending payment until the
 * courier collects; card gateways will reuse the same table.
 */
class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'method',
        'status',
        'amount_cents',
        'reference',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'method' => PaymentMethod::class,
        'status' => PaymentStatus::class,
        'amount_cents' => 'integer',
    ];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
