<?php

namespace App\Rules;

use App\Support\Phone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Moroccan mobile or landline number, in any of the accepted local formats.
 */
final class MoroccanPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Phone::isValid($value)) {
            $fail('Le numéro de téléphone doit être un numéro marocain valide.');
        }
    }
}
