<?php

use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\SettingsController;
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
