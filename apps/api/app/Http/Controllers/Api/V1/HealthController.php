<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->check(fn () => DB::connection()->select('select 1') !== []),
            'cache' => $this->check(fn () => Cache::store()->get('health_probe') === null),
        ];

        $healthy = ! in_array(false, $checks, true);

        return ApiResponse::data([
            'status' => $healthy ? 'ok' : 'degraded',
            'service' => 'luphera-api',
            'version' => 'v1',
            'checks' => $checks,
        ], status: $healthy ? 200 : 503);
    }

    private function check(callable $probe): bool
    {
        try {
            return (bool) $probe();
        } catch (Throwable) {
            return false;
        }
    }
}
