<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Engagement\Models\ContactMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Engagement\ContactRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * Storefront contact form.
 *
 * The message is stored, not e-mailed: the house answers from the back-office
 * inbox, and no mail transport is configured yet.
 */
class ContactController extends Controller
{
    public function store(ContactRequest $request): JsonResponse
    {
        ContactMessage::query()->create([
            'user_id' => $request->user()?->getKey(),
            'name' => (string) $request->validated('name'),
            'email' => (string) $request->validated('email'),
            'phone' => $request->validated('phone'),
            'subject' => (string) $request->validated('subject'),
            'body' => (string) $request->validated('message'),
            'status' => ContactMessage::STATUS_NEW,
            'ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255),
        ]);

        return ApiResponse::data(['received' => true], [], 201);
    }
}
