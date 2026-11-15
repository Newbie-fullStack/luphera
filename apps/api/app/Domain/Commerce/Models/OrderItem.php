<?php

namespace App\Domain\Commerce\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A frozen order line: product name, variant label, SKU and price at the time
 * of purchase.
 */
class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_variant_id',
        'product_slug',
        'product_name',
        'variant_label',
        'sku',
        'unit_price_cents',
        'quantity',
        'line_total_cents',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'unit_price_cents' => 'integer',
        'quantity' => 'integer',
        'line_total_cents' => 'integer',
    ];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
