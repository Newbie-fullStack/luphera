<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Single JSON envelope for the whole API: data, meta, errors.
 */
final class ApiResponse
{
    /**
     * @param array<string, mixed> $meta
     */
    public static function data(mixed $data, array $meta = [], int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => (object) $meta,
            'errors' => [],
        ], $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @param array<string, list<string>> $errors
     */
    public static function error(string $message, array $errors = [], int $status = 422, string $code = 'validation_error'): JsonResponse
    {
        return response()->json([
            'data' => null,
            'meta' => (object) [],
            'errors' => [
                'code' => $code,
                'message' => $message,
                'fields' => (object) $errors,
            ],
        ], $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
