<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Catalog\Models\Bundle;
use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\BundleResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class BundleController extends Controller
{
    public function index(): JsonResponse
    {
        $bundles = Bundle::query()
            ->with([
                'product.media',
                'items.variant.product',
            ])
            ->orderBy('id')
            ->get();

        return ApiResponse::data(
            $bundles
                ->map(fn (Bundle $bundle): array => BundleResource::make($bundle))
                ->all(),
            ['total' => $bundles->count()],
        );
    }
}
