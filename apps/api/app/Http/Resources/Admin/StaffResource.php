<?php

namespace App\Http\Resources\Admin;

use App\Models\User;

/**
 * Staff payload. Permissions are flattened so the admin SPA can hide actions
 * without guessing from the role name.
 */
final class StaffResource
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
            'roles' => $user->getRoleNames()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->sort()->values()->all(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }
}
