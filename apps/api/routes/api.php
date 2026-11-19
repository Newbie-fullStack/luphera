<?php

use App\Http\Controllers\Api\V1\AccountOrderController;
use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Api\V1\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\PageController as AdminPageController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\V1\Admin\StockController as AdminStockController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BundleController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\ShippingController;
use App\Http\Controllers\Api\V1\WishlistController;
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
Route::get('/pages', [PageController::class, 'index'])->name('api.pages.index');
Route::get('/pages/{slug}', [PageController::class, 'show'])->name('api.pages.show');

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
    Route::get('/me/orders/{number}/invoice', [InvoiceController::class, 'show'])->name('api.me.orders.invoice');

    Route::get('/me/addresses', [AddressController::class, 'index'])->name('api.me.addresses.index');
    Route::post('/me/addresses', [AddressController::class, 'store'])->name('api.me.addresses.store');
    Route::patch('/me/addresses/{address}', [AddressController::class, 'update'])->name('api.me.addresses.update');
    Route::delete('/me/addresses/{address}', [AddressController::class, 'destroy'])->name('api.me.addresses.destroy');

    Route::get('/me/wishlist', [WishlistController::class, 'index'])->name('api.me.wishlist.index');
    Route::post('/me/wishlist', [WishlistController::class, 'store'])->name('api.me.wishlist.store');
    Route::delete('/me/wishlist/{product}', [WishlistController::class, 'destroy'])->name('api.me.wishlist.destroy');
});

/*
|--------------------------------------------------------------------------
| Back-office
|--------------------------------------------------------------------------
|
| Every route below requires a staff session (`staff`) and a fine-grained
| permission. A customer session gets 403, never 404: the back-office is not a
| secret, it is closed.
|
*/

Route::prefix('admin')->name('api.admin.')->group(function (): void {
    Route::post('/login', [AdminAuthController::class, 'login'])
        ->middleware('throttle:auth')
        ->name('login');

    Route::middleware(['auth:sanctum', 'staff'])->group(function (): void {
        Route::post('/logout', [AdminAuthController::class, 'logout'])->name('logout');
        Route::get('/me', [AdminAuthController::class, 'me'])->name('me');

        Route::get('/dashboard', AdminDashboardController::class)
            ->middleware('permission:orders.view')
            ->name('dashboard');

        Route::middleware('permission:orders.view')->group(function (): void {
            Route::get('/orders', [AdminOrderController::class, 'index'])->name('orders.index');
            Route::get('/orders/export', [AdminOrderController::class, 'export'])->name('orders.export');
            Route::get('/orders/{number}', [AdminOrderController::class, 'show'])->name('orders.show');
            Route::get('/orders/{number}/packing-slip', [AdminOrderController::class, 'packingSlip'])->name('orders.packing-slip');
            Route::patch('/orders/{number}/status', [AdminOrderController::class, 'transition'])->name('orders.transition');
        });

        Route::middleware('permission:catalog.view')->group(function (): void {
            Route::get('/products', [AdminProductController::class, 'index'])->name('products.index');
            Route::get('/products/{product}', [AdminProductController::class, 'show'])->name('products.show');

            Route::get('/stock', [AdminStockController::class, 'index'])->name('stock.index');
            Route::get('/stock/movements', [AdminStockController::class, 'movements'])->name('stock.movements');
            Route::get('/stock/export', [AdminStockController::class, 'export'])->name('stock.export');
        });

        Route::middleware('permission:catalog.manage')->group(function (): void {
            Route::post('/products', [AdminProductController::class, 'store'])->name('products.store');
            Route::patch('/products/{product}', [AdminProductController::class, 'update'])->name('products.update');
            Route::post('/products/{product}/publish', [AdminProductController::class, 'publish'])->name('products.publish');
            Route::post('/products/{product}/unpublish', [AdminProductController::class, 'unpublish'])->name('products.unpublish');
            Route::delete('/products/{product}', [AdminProductController::class, 'archive'])->name('products.archive');

            Route::post('/products/{product}/variants', [AdminProductController::class, 'storeVariant'])->name('variants.store');
            Route::patch('/variants/{variant}', [AdminProductController::class, 'updateVariant'])->name('variants.update');
            Route::delete('/variants/{variant}', [AdminProductController::class, 'destroyVariant'])->name('variants.destroy');

            Route::post('/products/{product}/media', [AdminProductController::class, 'storeMedia'])->name('media.store');
            Route::patch('/media/{media}', [AdminProductController::class, 'updateMedia'])->name('media.update');
            Route::delete('/media/{media}', [AdminProductController::class, 'destroyMedia'])->name('media.destroy');

            Route::put('/products/{product}/notes', [AdminProductController::class, 'syncNotes'])->name('notes.sync');

            Route::post('/stock/adjust', [AdminStockController::class, 'adjust'])->name('stock.adjust');
            Route::post('/stock/import', [AdminStockController::class, 'import'])->name('stock.import');
        });

        Route::middleware('permission:customers.view')->group(function (): void {
            Route::get('/customers', [AdminCustomerController::class, 'index'])->name('customers.index');
            Route::get('/customers/{customer}', [AdminCustomerController::class, 'show'])->name('customers.show');
        });

        Route::middleware('permission:customers.manage')->group(function (): void {
            Route::patch('/customers/{customer}', [AdminCustomerController::class, 'update'])->name('customers.update');
            Route::post('/customers/{customer}/notes', [AdminCustomerController::class, 'storeNote'])->name('customers.notes.store');
        });

        Route::middleware('permission:marketing.manage')->group(function (): void {
            Route::get('/coupons', [AdminCouponController::class, 'index'])->name('coupons.index');
            Route::post('/coupons', [AdminCouponController::class, 'store'])->name('coupons.store');
            Route::patch('/coupons/{coupon}', [AdminCouponController::class, 'update'])->name('coupons.update');
            Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy'])->name('coupons.destroy');
        });

        Route::middleware('permission:settings.manage')->group(function (): void {
            Route::get('/settings', [AdminSettingsController::class, 'index'])->name('settings.index');
            Route::put('/settings', [AdminSettingsController::class, 'update'])->name('settings.update');
        });

        Route::middleware('permission:content.manage')->group(function (): void {
            Route::get('/pages', [AdminPageController::class, 'index'])->name('pages.index');
            Route::get('/pages/{page}', [AdminPageController::class, 'show'])->name('pages.show');
            Route::post('/pages', [AdminPageController::class, 'store'])->name('pages.store');
            Route::patch('/pages/{page}', [AdminPageController::class, 'update'])->name('pages.update');
            Route::delete('/pages/{page}', [AdminPageController::class, 'destroy'])->name('pages.destroy');
        });

        Route::middleware('permission:audit.view')->group(function (): void {
            Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit.index');
            Route::get('/audit-logs/actions', [AuditLogController::class, 'actions'])->name('audit.actions');
        });
    });
});
