<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;

class CartItemRequest extends FormRequest
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
        return [
            'variant_id' => ['required', 'string', 'size:26'],
            'quantity' => ['required', 'integer', 'min:1', 'max:10'],
        ];
    }

    public function variantId(): string
    {
        return (string) $this->validated('variant_id');
    }

    public function quantity(): int
    {
        return (int) $this->validated('quantity');
    }
}
