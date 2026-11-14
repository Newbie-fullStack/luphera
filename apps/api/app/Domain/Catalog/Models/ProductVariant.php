<?php

namespace App\Domain\Catalog\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A purchasable size of a product: the only place a price and a stock live.
 */
class ProductVariant extends Model
{
    use HasPublicId;
    use SoftDeletes;

    protected $fillable = [
        'product_id',
        'sku',
        'label',
        'size_ml',
        'price_cents',
        'compare_at_price_cents',
        'stock',
        'low_stock_threshold',
        'is_default',
        'position',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'size_ml' => 'integer',
        'price_cents' => 'integer',
        'compare_at_price_cents' => 'integer',
        'stock' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_default' => 'boolean',
        'position' => 'integer',
    ];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Coarse availability, safe to expose publicly: never the exact stock.
     */
    public function stockStatus(): string
    {
        if ($this->stock <= 0) {
            return 'out_of_stock';
        }

        return $this->stock <= $this->low_stock_threshold ? 'low_stock' : 'in_stock';
    }
}
