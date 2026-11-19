<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for the back-office: only staff roles reach /admin/*. Fine-grained
 * rights are then enforced per route with the `permission:` middleware.
 */
class EnsureStaff
{
    private const STAFF_ROLES = ['admin', 'manager', 'support'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponse::error('Authentification requise.', [], 401, 'unauthenticated');
        }

        if (! $user->hasAnyRole(self::STAFF_ROLES) || ! $user->is_active) {
            return ApiResponse::error(
                'Ce compte n’a pas accès à l’administration.',
                [],
                403,
                'forbidden',
            );
        }

        return $next($request);
    }
}
