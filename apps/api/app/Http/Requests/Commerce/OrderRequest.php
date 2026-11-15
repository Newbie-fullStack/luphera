<?php

namespace App\Http\Requests\Commerce;

use App\Domain\Commerce\Models\City;
use App\Rules\MoroccanPhone;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('phone'))) {
            $this->merge(['phone' => Phone::normalize($this->input('phone'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:20', new MoroccanPhone],
            'email' => ['nullable', 'email', 'max:190'],
            'city' => [
                'required',
                'string',
                'max:64',
                Rule::exists(City::class, 'slug')->where('is_active', true),
            ],
            'district' => ['required', 'string', 'min:2', 'max:80'],
            'address' => ['required', 'string', 'min:5', 'max:200'],
            'landmark' => ['nullable', 'string', 'min:2', 'max:120'],
            'note' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['required', 'string', Rule::in(['cod'])],
            'terms' => ['accepted'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'terms.accepted' => 'Vous devez accepter les conditions générales de vente.',
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
