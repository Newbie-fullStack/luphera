<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Account\Services\OrderClaimService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\ForgotPasswordRequest;
use App\Http\Requests\Account\LoginRequest;
use App\Http\Requests\Account\RegisterRequest;
use App\Http\Requests\Account\ResetPasswordRequest;
use App\Http\Resources\Account\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * Session-based authentication for the SPA (Sanctum cookies, httpOnly).
 * Tokens are not issued: the browser holds the session cookie only.
 */
class AuthController extends Controller
{
    public function register(RegisterRequest $request, OrderClaimService $claims): JsonResponse
    {
        $user = DB::transaction(function () use ($request, $claims): User {
            $user = User::create([
                'name' => (string) $request->validated('name'),
                'phone' => (string) $request->validated('phone'),
                'email' => $request->validated('email'),
                'password' => (string) $request->validated('password'),
                'marketing_opt_in' => (bool) $request->validated('marketing_opt_in', false),
            ]);

            $user->assignRole('customer');
            $claims->claimFor($user);

            return $user;
        });

        $this->startSession($request, $user);

        return ApiResponse::data(UserResource::make($user), [], 201);
    }

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
            return ApiResponse::error(
                'Ce compte est désactivé. Contactez la maison.',
                [],
                403,
                'account_disabled',
            );
        }

        $this->startSession($request, $user);

        return ApiResponse::data(UserResource::make($user));
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

    /**
     * Always answers the same message: whether an account exists for the
     * address must not be discoverable from this endpoint.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink(['email' => (string) $request->validated('email')]);

        return ApiResponse::data([
            'message' => 'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['Ce lien de réinitialisation est invalide ou expiré.'],
            ]);
        }

        return ApiResponse::data([
            'message' => 'Mot de passe mis à jour. Vous pouvez vous connecter.',
        ]);
    }

    /**
     * Opens an authenticated session when the request is stateful. The API is
     * also callable without a session (health checks, token clients), so the
     * guard must not assume a session store exists.
     */
    private function startSession(Request $request, User $user): void
    {
        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        $user->forceFill(['last_login_at' => now()])->save();
    }
}
