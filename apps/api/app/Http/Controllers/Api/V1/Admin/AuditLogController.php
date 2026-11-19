<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Models\AuditLog;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only journal of sensitive staff actions. Rows are never edited or
 * deleted: this is the answer when a price change or a cancellation is
 * contested weeks later.
 */
class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:80'],
            'q' => ['nullable', 'string', 'max:80'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $logs = AuditLog::query()
            ->with('user')
            ->when(
                isset($validated['action']),
                fn (Builder $query): Builder => $query->where('action', 'like', $validated['action'].'%'),
            )
            ->when(
                isset($validated['q']),
                function (Builder $query) use ($validated): Builder {
                    $term = '%'.trim((string) $validated['q']).'%';

                    return $query->where(fn (Builder $query): Builder => $query
                        ->where('subject_label', 'like', $term)
                        ->orWhere('action', 'like', $term)
                        ->orWhereHas('user', fn (Builder $query): Builder => $query->where('name', 'like', $term)));
                },
            )
            ->when(
                isset($validated['from']),
                fn (Builder $query): Builder => $query->where('created_at', '>=', $validated['from'].' 00:00:00'),
            )
            ->when(
                isset($validated['to']),
                fn (Builder $query): Builder => $query->where('created_at', '<=', $validated['to'].' 23:59:59'),
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(50)
            ->withQueryString();

        return ApiResponse::data(
            $logs->getCollection()
                ->map(fn (AuditLog $log): array => [
                    'id' => $log->getKey(),
                    'action' => $log->action,
                    'subject_type' => $log->subject_type === null
                        ? null
                        : class_basename($log->subject_type),
                    'subject_label' => $log->subject_label,
                    'changes' => $log->changes,
                    'ip' => $log->ip,
                    'author' => $log->user?->name,
                    'at' => $log->created_at?->toIso8601String(),
                ])
                ->all(),
            [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        );
    }

    /**
     * Distinct actions, used to populate the filter without hardcoding it in
     * the admin app.
     */
    public function actions(): JsonResponse
    {
        $actions = AuditLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action')
            ->all();

        return ApiResponse::data($actions);
    }
}
