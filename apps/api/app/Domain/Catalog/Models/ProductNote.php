<?php

namespace App\Domain\Catalog\Models;

use App\Domain\Catalog\Enums\NoteLevel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One olfactory note, attached to a pyramid level (top, heart, base).
 */
class ProductNote extends Model
{
    protected $fillable = [
        'product_id',
        'level',
        'name',
        'position',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'level' => NoteLevel::class,
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
