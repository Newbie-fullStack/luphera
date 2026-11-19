<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Content\Models\Page;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PageController extends Controller
{
    /**
     * One published editorial page. Drafts answer 404, exactly like a missing
     * page: the storefront must not be able to reveal unpublished content.
     */
    public function show(string $slug): JsonResponse
    {
        $page = Page::query()->published()->where('slug', $slug)->first();

        abort_if($page === null, 404);

        return ApiResponse::data([
            'slug' => $page->slug,
            'title' => $page->title,
            'body' => $page->body,
            'meta' => [
                'title' => $page->meta_title ?? $page->title,
                'description' => $page->meta_description,
            ],
            'updated_at' => $page->updated_at?->toIso8601String(),
        ]);
    }

    /**
     * Published pages, for the footer and sitemap.
     */
    public function index(): JsonResponse
    {
        $pages = Page::query()
            ->published()
            ->orderBy('position')
            ->get(['slug', 'title', 'updated_at']);

        return ApiResponse::data(
            $pages->map(fn (Page $page): array => [
                'slug' => $page->slug,
                'title' => $page->title,
                'updated_at' => $page->updated_at?->toIso8601String(),
            ])->all(),
        );
    }
}
