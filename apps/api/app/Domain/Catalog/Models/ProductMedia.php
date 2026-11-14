<?php

namespace App\Domain\Catalog\Models;

use App\Domain\Catalog\Enums\MediaType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Photo or 3D model attached to a product.
 */
class ProductMedia extends Model
{
    protected $fillable = [
        'product_id',
        'type',
        'url',
        'alt',
        'position',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'type' => MediaType::class,
        'position' => 'integer',
    ];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
