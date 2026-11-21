<?php

namespace App\Http\Requests\Engagement;

use App\Rules\MoroccanPhone;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

class ContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('phone')) && trim($this->input('phone')) !== '') {
            $this->merge(['phone' => Phone::normalize($this->input('phone'))]);
        }
    }

    /**
     * `website` is a honeypot: a human never fills it, a bot usually does.
     * A filled honeypot fails validation like any other malformed payload.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:20', new MoroccanPhone],
            'subject' => ['required', 'string', 'min:2', 'max:120'],
            'message' => ['required', 'string', 'min:20', 'max:2000'],
            'website' => ['nullable', 'string', 'max:0'],
        ];
    }
}
