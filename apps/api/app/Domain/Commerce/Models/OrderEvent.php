<?php

namespace App\Domain\Commerce\Models;

use App\Domain\Commerce\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only order history. One row per status change.
 */
class OrderEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'status',
        'author',
        'comment',
        'created_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'status' => OrderStatus::class,
        'created_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
