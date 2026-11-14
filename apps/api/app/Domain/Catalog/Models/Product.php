<?php

namespace App\Domain\Catalog\Models;

use App\Domain\Catalog\Enums\ProductLine;
use App\Domain\Catalog\Enums\ProductStatus;
use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A fragrance or a gift set sold by the house.
 *
 * Prices live on variants, never on the product: a product is a story,
 * a variant is what the customer actually buys.
 */
class Product extends Model
{
    use HasPublicId;
    use SoftDeletes;

    protected $fillable = [
        'slug',
        'name',
        'line',
        'family',
        'tag',
        'short_description',
        'description',
        'status',
        'intensity',
        'longevity',
        'sillage',
        'season',
        'occasion',
        'from_price_cents',
        'position',
        'is_demo',
        'seo_title',
        'seo_description',
        'published_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'line' => ProductLine::class,
        'status' => ProductStatus::class,
        'intensity' => 'integer',
        'longevity' => 'integer',
        'sillage' => 'integer',
        'from_price_cents' => 'integer',
        'position' => 'integer',
        'is_demo' => 'boolean',
        'published_at' => 'datetime',
    ];

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('position');
    }

    /**
     * @return HasMany<ProductNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(ProductNote::class)->orderBy('position');
    }

    /**
     * @return HasMany<ProductMedia, $this>
     */
    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class)->orderBy('position');
    }

    /**
     * @return HasOne<Bundle, $this>
     */
    public function bundle(): HasOne
    {
        return $this->hasOne(Bundle::class);
    }

    /**
     * Products visible in the storefront: active and published.
     *
     * @param Builder<Product> $query
     * @return Builder<Product>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where('status', ProductStatus::Active)
            ->where(function (Builder $query): void {
                $query->whereNull('published_at')->orWhere('published_at', '<=', now());
            });
    }
}
