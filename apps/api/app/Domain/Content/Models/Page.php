<?php

namespace App\Domain\Content\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * An editorial page (story, delivery, legal). The storefront reads only
 * published pages; the admin edits the draft body.
 */
class Page extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'body',
        'meta_title',
        'meta_description',
        'is_published',
        'position',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'is_published' => 'boolean',
        'position' => 'integer',
    ];

    /**
     * @param Builder<Page> $query
     * @return Builder<Page>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
