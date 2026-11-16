<?php

use App\Http\Controllers\Api\V1\AccountOrderController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BundleController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\ShippingController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
|
| The prefix /api/v1 is applied in bootstrap/app.php. Controllers stay thin;
| business logic lives in App\Domain\* actions.
|
*/

Route::get('/', fn () => ApiResponse::data([
    'name' => 'Luphéra API',
    'version' => 'v1',
    'documentation' => 'docs/API.md',
]));

Route::get('/health', HealthController::class)->name('api.health');
Route::get('/settings/public', SettingsController::class)->name('api.settings.public');

Route::middleware('throttle:api')->group(function (): void {
    Route::get('/products', [ProductController::class, 'index'])->name('api.products.index');
    Route::get('/products/{slug}', [ProductController::class, 'show'])->name('api.products.show');
    Route::get('/products/{slug}/related', [ProductController::class, 'related'])->name('api.products.related');
    Route::get('/bundles', [BundleController::class, 'index'])->name('api.bundles.index');

    Route::get('/shipping/cities', [ShippingController::class, 'cities'])->name('api.shipping.cities');
    Route::get('/shipping/quote', [ShippingController::class, 'quote'])->name('api.shipping.quote');

    Route::get('/cart', [CartController::class, 'show'])->name('api.cart.show');
    Route::post('/cart/items', [CartController::class, 'storeItem'])->name('api.cart.items.store');
    Route::patch('/cart/items/{item}', [CartController::class, 'updateItem'])->name('api.cart.items.update');
    Route::delete('/cart/items/{item}', [CartController::class, 'destroyItem'])->name('api.cart.items.destroy');
    Route::post('/cart/coupon', [CartController::class, 'applyCoupon'])->name('api.cart.coupon.store');
    Route::delete('/cart/coupon', [CartController::class, 'removeCoupon'])->name('api.cart.coupon.destroy');
});

Route::middleware('throttle:orders')->group(function (): void {
    Route::post('/orders', [OrderController::class, 'store'])->name('api.orders.store');
    Route::get('/orders/{number}', [OrderController::class, 'show'])->name('api.orders.show');
});

Route::middleware('throttle:auth')->group(function (): void {
    Route::post('/auth/register', [AuthController::class, 'register'])->name('api.auth.register');
    Route::post('/auth/login', [AuthController::class, 'login'])->name('api.auth.login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->name('api.auth.password.email');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->name('api.auth.password.reset');
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.auth.logout');

    Route::get('/me', [ProfileController::class, 'show'])->name('api.me.show');
    Route::patch('/me', [ProfileController::class, 'update'])->name('api.me.update');

    Route::get('/me/orders', [AccountOrderController::class, 'index'])->name('api.me.orders.index');
    Route::get('/me/orders/{number}', [AccountOrderController::class, 'show'])->name('api.me.orders.show');
});
