<?php

namespace App\Http\Resources\Account;

use App\Models\User;

/**
 * Authenticated customer payload. Never exposes the password hash, the
 * remember token or the internal integer id.
 */
final class UserResource
{
    /**
     * @return array<string, mixed>
     */
    public static function make(User $user): array
    {
        return [
            'id' => $user->public_id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'phone_verified' => $user->phone_verified_at !== null,
            'marketing_opt_in' => (bool) $user->marketing_opt_in,
            'roles' => $user->getRoleNames()->all(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
