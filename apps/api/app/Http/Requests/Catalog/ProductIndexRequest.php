<?php

namespace App\Http\Requests\Catalog;

use App\Domain\Catalog\Enums\ProductLine;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxPrice = ['nullable', 'integer', 'min:0'];

        if ($this->filled('min_price')) {
            $maxPrice[] = 'gte:min_price';
        }

        return [
            'line' => ['nullable', Rule::enum(ProductLine::class)],
            'family' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'array', 'max:6'],
            'notes.*' => ['string', 'max:80'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => $maxPrice,
            'q' => ['nullable', 'string', 'min:2', 'max:80'],
            'sort' => ['nullable', Rule::in(['pertinence', 'prix-asc', 'prix-desc', 'nouveau'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:24'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $notes = $this->input('notes');

        if (is_string($notes)) {
            $this->merge([
                'notes' => array_values(array_filter(array_map('trim', explode(',', $notes)))),
            ]);
        }
    }

    /**
     * Normalised filters consumed by ProductIndexQuery.
     *
     * @return array{line: string|null, family: string|null, notes: list<string>, min_price: int|null, max_price: int|null, q: string|null, sort: string, per_page: int}
     */
    public function filters(): array
    {
        return [
            'line' => $this->input('line'),
            'family' => $this->input('family'),
            'notes' => array_values((array) $this->input('notes', [])),
            'min_price' => $this->has('min_price') ? $this->integer('min_price') : null,
            'max_price' => $this->has('max_price') ? $this->integer('max_price') : null,
            'q' => $this->input('q'),
            'sort' => (string) $this->input('sort', 'pertinence'),
            'per_page' => $this->integer('per_page', 12),
        ];
    }
}
