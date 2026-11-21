<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Engagement\Models\ContactMessage;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Contact inbox. Messages arrive from the storefront form; the team reads them
 * here and moves them through new → read → replied → archived.
 */
class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(ContactMessage::STATUSES)],
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $messages = ContactMessage::query()
            ->when(
                isset($validated['status']),
                fn (Builder $query): Builder => $query->where('status', $validated['status']),
            )
            ->when(
                isset($validated['q']),
                function (Builder $query) use ($validated): Builder {
                    $term = '%'.trim((string) $validated['q']).'%';

                    return $query->where(fn (Builder $query): Builder => $query
                        ->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('phone', 'like', $term)
                        ->orWhere('subject', 'like', $term));
                },
            )
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return ApiResponse::data(
            $messages->getCollection()
                ->map(fn (ContactMessage $message): array => $this->summary($message))
                ->all(),
            [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
                'new_count' => ContactMessage::query()->where('status', ContactMessage::STATUS_NEW)->count(),
            ],
        );
    }

    public function show(ContactMessage $message): JsonResponse
    {
        $message->loadMissing('user');

        return ApiResponse::data($this->summary($message) + [
            'body' => $message->body,
            'user_agent' => $message->user_agent,
            'customer' => $message->user === null
                ? null
                : [
                    'id' => $message->user->public_id,
                    'name' => $message->user->name,
                    'phone' => $message->user->phone,
                ],
        ]);
    }

    public function update(Request $request, ContactMessage $message, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(ContactMessage::STATUSES)],
        ]);

        $before = $message->status;
        $status = (string) $validated['status'];

        $message->status = $status;

        if ($status !== ContactMessage::STATUS_NEW && $message->read_at === null) {
            $message->read_at = now();
        }

        if ($status === ContactMessage::STATUS_REPLIED) {
            $message->replied_at = now();
        }

        $message->save();

        $audit->log($request, 'message.updated', $message, [
            'status' => ['before' => $before, 'after' => $status],
        ], $message->subject);

        return ApiResponse::data($this->summary($message));
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(ContactMessage $message): array
    {
        return [
            'id' => $message->getKey(),
            'name' => $message->name,
            'email' => $message->email,
            'phone' => $message->phone,
            'subject' => $message->subject,
            'status' => $message->status,
            'excerpt' => mb_strimwidth($message->body, 0, 140, '…'),
            'ip' => $message->ip,
            'created_at' => $message->created_at?->toIso8601String(),
            'read_at' => $message->read_at?->toIso8601String(),
            'replied_at' => $message->replied_at?->toIso8601String(),
        ];
    }
}
