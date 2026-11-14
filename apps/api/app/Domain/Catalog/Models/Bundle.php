<?php

namespace App\Domain\Catalog\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Editorial composition of a gift set. The set itself is a product with its
 * own variant; the bundle only describes what is inside.
 */
class Bundle extends Model
{
    use HasPublicId;

    protected $fillable = [
        'product_id',
        'name',
    ];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return HasMany<BundleItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(BundleItem::class)->orderBy('position');
    }
}
