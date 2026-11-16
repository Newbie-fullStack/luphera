<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(12)->letters()->mixedCase()->numbers()->uncompromised()
            : Password::min(8)->letters()->numbers());

        $this->registerRateLimiters();
        $this->registerSuperAdmin();
    }

    private function registerRateLimiters(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(5)->by('auth:'.($request->input('identifier') ?? $request->input('phone') ?? $request->input('email') ?? $request->ip())),
            Limit::perMinute(20)->by('auth-ip:'.$request->ip()),
        ]);

        RateLimiter::for('orders', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('public-forms', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        RateLimiter::for('ai', fn (Request $request) => [
            Limit::perMinute(12)->by('ai:'.($request->user()?->getAuthIdentifier()
                ?? ($request->hasSession() ? $request->session()->getId() : $request->ip()))),
            Limit::perDay(300)->by('ai-day:'.$request->ip()),
        ]);
    }

    private function registerSuperAdmin(): void
    {
        Gate::before(function ($user): ?bool {
            return $user->hasRole('admin') ? true : null;
        });
    }
}
