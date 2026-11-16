<?php

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Phone changes are not accepted here: they require an SMS challenge before
 * the account can be moved to a new number (tracked in docs/DECISIONS.md).
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email')) && $this->input('email') !== '') {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $id = $user instanceof User ? $user->id : null;

        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:190',
                Rule::unique('users', 'email')->ignore($id),
            ],
            'marketing_opt_in' => ['sometimes', 'boolean'],
        ];
    }
}
