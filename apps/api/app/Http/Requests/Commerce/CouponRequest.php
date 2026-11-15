<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;

class CouponRequest extends FormRequest
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
            'code' => ['required', 'string', 'min:2', 'max:32'],
        ];
    }

    public function code(): string
    {
        return (string) $this->validated('code');
    }
}
