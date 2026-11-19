<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Models\CustomerNote;
use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Commerce\Models\Order;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Customer files. Staff see the order history and can leave an internal note;
 * the customer never sees these notes, and the phone number stays read-only
 * here (only the customer can change it, from their account).
 */
class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'active' => ['nullable', 'boolean'],
        ]);

        $customers = User::query()
            ->role('customer')
            ->when(
                isset($validated['q']),
                function (Builder $query) use ($validated): Builder {
                    $term = '%'.trim((string) $validated['q']).'%';

                    return $query->where(fn (Builder $query): Builder => $query
                        ->where('name', 'like', $term)
                        ->orWhere('phone', 'like', $term)
                        ->orWhere('email', 'like', $term));
                },
            )
            ->when(
                array_key_exists('active', $validated),
                fn (Builder $query): Builder => $query->where('is_active', (bool) $validated['active']),
            )
            ->withCount('orders')
            ->withSum(
                ['orders as spent_cents' => fn (Builder $query): Builder => $query->where('status', '!=', 'cancelled')],
                'total_cents',
            )
            ->withMax('orders as last_order_at', 'placed_at')
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return ApiResponse::data(
            $customers->getCollection()
                ->map(fn (User $user): array => [
                    'id' => $user->public_id,
                    'name' => $user->name,
                    'phone' => $user->phone,
                    'email' => $user->email,
                    'is_active' => $user->is_active,
                    'marketing_opt_in' => $user->marketing_opt_in,
                    'created_at' => $user->created_at?->toIso8601String(),
                    'orders_count' => (int) $user->getAttribute('orders_count'),
                    'spent_cents' => (int) ($user->getAttribute('spent_cents') ?? 0),
                    'last_order_at' => $user->getAttribute('last_order_at') === null
                        ? null
                        : Carbon::parse((string) $user->getAttribute('last_order_at'))->toIso8601String(),
                ])
                ->all(),
            [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        );
    }

    public function show(string $customer): JsonResponse
    {
        $user = User::query()
            ->where('public_id', $customer)
            ->with([
                'addresses.city',
                'notes' => fn ($query) => $query->with('author')->latest()->limit(50),
            ])
            ->withCount('orders')
            ->withSum(
                ['orders as spent_cents' => fn (Builder $query): Builder => $query->where('status', '!=', 'cancelled')],
                'total_cents',
            )
            ->first();

        abort_if($user === null, 404);

        $orders = $user->orders()
            ->with('items')
            ->orderByDesc('placed_at')
            ->limit(30)
            ->get();

        return ApiResponse::data([
            'id' => $user->public_id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'marketing_opt_in' => $user->marketing_opt_in,
            'created_at' => $user->created_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'orders_count' => (int) $user->orders_count,
            'spent_cents' => (int) ($user->spent_cents ?? 0),
            'segment' => $this->segment($user, $orders),
            'orders' => $orders
                ->map(fn ($order): array => [
                    'number' => $order->number,
                    'status' => $order->status->value,
                    'placed_at' => $order->placed_at->toIso8601String(),
                    'total_cents' => $order->total_cents,
                    'items_count' => (int) $order->items->sum('quantity'),
                ])
                ->all(),
            'addresses' => $user->addresses
                ->map(fn ($address): array => [
                    'id' => $address->public_id,
                    'label' => $address->label,
                    'city' => $address->city?->name,
                    'district' => $address->district,
                    'line1' => $address->line1,
                    'is_default' => $address->is_default,
                ])
                ->all(),
            'notes' => $user->notes
                ->map(fn (CustomerNote $note): array => [
                    'id' => $note->getKey(),
                    'body' => $note->body,
                    'author' => $note->author?->name,
                    'created_at' => $note->created_at->toIso8601String(),
                ])
                ->all(),
        ]);
    }

    public function update(Request $request, string $customer, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $user = User::query()->where('public_id', $customer)->first();
        abort_if($user === null, 404);

        $before = $user->is_active;
        $user->forceFill(['is_active' => $validated['is_active']])->save();

        $audit->log($request, 'customer.updated', $user, [
            'is_active' => ['before' => $before, 'after' => $user->is_active],
        ], $user->name);

        return ApiResponse::data([
            'id' => $user->public_id,
            'is_active' => $user->is_active,
        ]);
    }

    public function storeNote(Request $request, string $customer, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $user = User::query()->where('public_id', $customer)->first();
        abort_if($user === null, 404);

        $note = CustomerNote::query()->create([
            'user_id' => $user->getKey(),
            'author_id' => $request->user()?->getKey(),
            'body' => $validated['body'],
        ]);

        $audit->log($request, 'customer.note_added', $user, [], $user->name);

        return ApiResponse::data([
            'id' => $note->getKey(),
            'body' => $note->body,
            'author' => $request->user()?->name,
            'created_at' => $note->created_at?->toIso8601String(),
        ], [], 201);
    }

    /**
     * Coarse segments used to sort the customer list; computed, never stored.
     *
     * @param Collection<int, Order> $orders
     */
    private function segment(User $user, $orders): string
    {
        $spent = (int) $orders
            ->reject(fn ($order): bool => $order->status->value === 'cancelled')
            ->sum('total_cents');

        if ($spent >= 200000 || $orders->count() >= 3) {
            return 'vip';
        }

        if ($user->created_at !== null && $user->created_at->greaterThan(now()->subDays(30))) {
            return 'new';
        }

        $last = $orders->first()?->placed_at;

        if ($last !== null && $last->lessThan(now()->subDays(90))) {
            return 'inactive';
        }

        return 'regular';
    }
}
