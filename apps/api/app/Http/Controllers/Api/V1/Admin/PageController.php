<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Content\Models\Page;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Editorial pages (story, delivery, legal). The storefront only ever reads
 * published pages, so a draft can be prepared without going live.
 */
class PageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = Page::query()
            ->orderBy('position')
            ->orderBy('title')
            ->get();

        return ApiResponse::data(
            $pages->map(fn (Page $page): array => $this->summary($page))->all(),
        );
    }

    public function show(Page $page): JsonResponse
    {
        return ApiResponse::data($this->payload($page));
    }

    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $page = Page::query()->create($validated + [
            'slug' => $this->uniqueSlug((string) ($validated['slug'] ?? $validated['title'])),
            'is_published' => $validated['is_published'] ?? false,
            'position' => (int) Page::query()->max('position') + 1,
        ]);

        $audit->log($request, 'page.created', $page, ['title' => $page->title], $page->title);

        return ApiResponse::data($this->payload($page), [], 201);
    }

    public function update(Request $request, Page $page, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->rules($page));

        if (isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
        }

        $before = $page->only(['title', 'slug', 'is_published']);
        $page->fill($validated)->save();

        $audit->log($request, 'page.updated', $page, [
            'before' => $before,
            'after' => $page->only(['title', 'slug', 'is_published']),
        ], $page->title);

        return ApiResponse::data($this->payload($page->refresh()));
    }

    public function destroy(Request $request, Page $page, AuditLogger $audit): JsonResponse
    {
        $title = $page->title;
        $page->delete();

        $audit->log($request, 'page.deleted', null, ['title' => $title], $title);

        return ApiResponse::data(null);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?Page $page = null): array
    {
        $required = $page === null ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'min:2', 'max:190'],
            'slug' => [
                'sometimes',
                'string',
                'max:80',
                'alpha_dash',
                Rule::unique('pages', 'slug')->ignore($page?->getKey()),
            ],
            'body' => [$required, 'string', 'min:1'],
            'meta_title' => ['nullable', 'string', 'max:190'],
            'meta_description' => ['nullable', 'string', 'max:320'],
            'is_published' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ];
    }

    private function uniqueSlug(string $source): string
    {
        $base = Str::slug($source);
        $slug = $base;
        $suffix = 2;

        while (Page::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Page $page): array
    {
        return [
            'id' => $page->getKey(),
            'slug' => $page->slug,
            'title' => $page->title,
            'is_published' => $page->is_published,
            'position' => $page->position,
            'updated_at' => $page->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Page $page): array
    {
        return $this->summary($page) + [
            'body' => $page->body,
            'meta_title' => $page->meta_title,
            'meta_description' => $page->meta_description,
            'created_at' => $page->created_at?->toIso8601String(),
        ];
    }
}
