<?php

namespace App\Http\Requests\Account;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $identifier = $this->input('identifier');

        if (is_string($identifier) && $identifier !== '') {
            $trimmed = trim($identifier);

            $this->merge([
                'identifier' => str_contains($trimmed, '@')
                    ? mb_strtolower($trimmed)
                    : Phone::normalize($trimmed),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string', 'max:190'],
        ];
    }
}
