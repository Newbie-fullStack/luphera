<?php

namespace App\Domain\Commerce\Models;

use App\Domain\Catalog\Models\ProductVariant;
use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One variant and a quantity. The price is never stored here: it is read from
 * the catalogue every time the cart is displayed.
 */
class CartItem extends Model
{
    use HasPublicId;

    protected $fillable = [
        'cart_id',
        'product_variant_id',
        'quantity',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
    ];

    /**
     * @return BelongsTo<Cart, $this>
     */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
