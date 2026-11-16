<?php

namespace App\Http\Requests\Account;

use App\Domain\Commerce\Models\City;
use App\Rules\MoroccanPhone;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddressRequest extends FormRequest
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
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'label' => ['nullable', 'string', 'max:40'],
            'recipient_name' => [$required, 'string', 'min:2', 'max:120'],
            'phone' => [$required, 'string', 'max:20', new MoroccanPhone],
            'city' => [
                $required,
                'string',
                'max:64',
                Rule::exists(City::class, 'slug')->where('is_active', true),
            ],
            'district' => [$required, 'string', 'min:2', 'max:80'],
            'address' => [$required, 'string', 'min:5', 'max:200'],
            'landmark' => ['nullable', 'string', 'max:120'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
