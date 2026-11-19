<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Writes the audit trail. Controllers call `log()` after a successful write,
 * passing only the fields that changed: the diff is what makes the journal
 * useful when a price or a status is contested later.
 */
final class AuditLogger
{
    /**
     * @param array<string, mixed> $changes
     */
    public function log(
        Request $request,
        string $action,
        ?Model $subject = null,
        array $changes = [],
        ?string $label = null,
    ): AuditLog {
        $user = $request->user();

        return AuditLog::query()->create([
            'user_id' => $user instanceof User ? $user->getKey() : null,
            'action' => $action,
            'subject_type' => $subject === null ? null : $subject::class,
            'subject_id' => $subject?->getKey(),
            'subject_label' => $label,
            'changes' => $changes === [] ? null : $changes,
            'ip' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
            'created_at' => now(),
        ]);
    }
}
