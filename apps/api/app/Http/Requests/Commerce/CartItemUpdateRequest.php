<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;

class CartItemUpdateRequest extends FormRequest
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
            'quantity' => ['required', 'integer', 'min:0', 'max:10'],
        ];
    }

    public function quantity(): int
    {
        return (int) $this->validated('quantity');
    }
}
