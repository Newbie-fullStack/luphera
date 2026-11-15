<?php

namespace App\Http\Requests\Commerce;

use App\Domain\Commerce\Models\City;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShippingQuoteRequest extends FormRequest
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
            'city' => [
                'required',
                'string',
                'max:64',
                Rule::exists(City::class, 'slug')->where('is_active', true),
            ],
        ];
    }

    public function city(): City
    {
        return City::query()
            ->where('slug', (string) $this->validated('city'))
            ->where('is_active', true)
            ->firstOrFail();
    }
}
