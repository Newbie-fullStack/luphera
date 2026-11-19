<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\LoginRequest;
use App\Http\Resources\Admin\StaffResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Staff session. Same Sanctum cookie as the storefront, but the account must
 * hold a back-office role: a customer session is not an admin session.
 */
class AuthController extends Controller
{
    private const STAFF_ROLES = ['admin', 'manager', 'support'];

    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = (string) $request->validated('identifier');

        $user = User::query()
            ->where(str_contains($identifier, '@') ? 'email' : 'phone', $identifier)
            ->first();

        if ($user === null || ! Hash::check((string) $request->validated('password'), $user->password)) {
            return ApiResponse::error(
                'Identifiants incorrects.',
                ['identifier' => ['Le téléphone, l’e-mail ou le mot de passe ne correspond pas.']],
                422,
                'invalid_credentials',
            );
        }

        if (! $user->is_active) {
            return ApiResponse::error('Ce compte est désactivé.', [], 403, 'account_disabled');
        }

        if (! $user->hasAnyRole(self::STAFF_ROLES)) {
            return ApiResponse::error(
                'Ce compte n’a pas accès à l’administration.',
                [],
                403,
                'forbidden',
            );
        }

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return ApiResponse::data(StaffResource::make($user));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return ApiResponse::data(null);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return ApiResponse::data(StaffResource::make($user));
    }
}
