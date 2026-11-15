<?php

namespace App\Domain\Commerce\Models;

use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Enums\StockMovementReason;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Every stock change leaves a trace: order, cancellation, return, manual.
 */
class StockMovement extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'product_variant_id',
        'order_id',
        'quantity',
        'reason',
        'author',
        'created_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
        'reason' => StockMovementReason::class,
        'created_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
