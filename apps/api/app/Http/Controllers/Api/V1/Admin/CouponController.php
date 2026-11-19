<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Admin\Services\AuditLogger;
use App\Domain\Commerce\Enums\CouponType;
use App\Domain\Commerce\Models\Coupon;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Discount codes. The percentage ceiling is validated here so a typo can never
 * publish a 150 % coupon.
 */
class CouponController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:40'],
            'active' => ['nullable', 'boolean'],
        ]);

        $coupons = Coupon::query()
            ->when(
                isset($validated['q']),
                fn (Builder $query): Builder => $query->where('code', 'like', '%'.strtoupper(trim((string) $validated['q'])).'%'),
            )
            ->when(
                array_key_exists('active', $validated),
                fn (Builder $query): Builder => $query->where('is_active', (bool) $validated['active']),
            )
            ->orderByDesc('created_at')
            ->paginate(30)
            ->withQueryString();

        return ApiResponse::data(
            $coupons->getCollection()->map(fn (Coupon $coupon): array => $this->payload($coupon))->all(),
            [
                'current_page' => $coupons->currentPage(),
                'last_page' => $coupons->lastPage(),
                'per_page' => $coupons->perPage(),
                'total' => $coupons->total(),
            ],
        );
    }

    public function store(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $validated['code'] = strtoupper($validated['code']);

        $coupon = Coupon::query()->create($validated + [
            'used_count' => 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $audit->log($request, 'coupon.created', $coupon, ['code' => $coupon->code], $coupon->code);

        return ApiResponse::data($this->payload($coupon), [], 201);
    }

    public function update(Request $request, Coupon $coupon, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate($this->rules($coupon));

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $before = $coupon->only(['code', 'type', 'value', 'is_active', 'max_uses']);
        $coupon->fill($validated)->save();

        $audit->log($request, 'coupon.updated', $coupon, [
            'before' => $before,
            'after' => $coupon->only(['code', 'type', 'value', 'is_active', 'max_uses']),
        ], $coupon->code);

        return ApiResponse::data($this->payload($coupon->refresh()));
    }

    public function destroy(Request $request, Coupon $coupon, AuditLogger $audit): JsonResponse
    {
        $code = $coupon->code;

        // A coupon already used on an order is kept for history: deactivate it
        // instead of deleting the row the order points to.
        if ($coupon->used_count > 0) {
            $coupon->forceFill(['is_active' => false])->save();
            $audit->log($request, 'coupon.deactivated', $coupon, [], $code);

            return ApiResponse::data($this->payload($coupon));
        }

        $coupon->delete();
        $audit->log($request, 'coupon.deleted', null, ['code' => $code], $code);

        return ApiResponse::data(null);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?Coupon $coupon = null): array
    {
        $required = $coupon === null ? 'required' : 'sometimes';

        return [
            'code' => [
                $required,
                'string',
                'min:3',
                'max:32',
                'alpha_dash',
                Rule::unique('coupons', 'code')->ignore($coupon?->getKey()),
            ],
            'type' => [$required, 'string', Rule::enum(CouponType::class)],
            'value' => [
                $required,
                'integer',
                'min:1',
                Rule::when(
                    request()->input('type') === CouponType::Percentage->value,
                    ['max:100'],
                    ['max:10000000'],
                ),
            ],
            'max_discount_cents' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'min_subtotal_cents' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Coupon $coupon): array
    {
        return [
            'id' => $coupon->getKey(),
            'code' => $coupon->code,
            'type' => $coupon->type->value,
            'value' => $coupon->value,
            'max_discount_cents' => $coupon->max_discount_cents,
            'min_subtotal_cents' => $coupon->min_subtotal_cents,
            'starts_at' => $coupon->starts_at?->toIso8601String(),
            'ends_at' => $coupon->ends_at?->toIso8601String(),
            'max_uses' => $coupon->max_uses,
            'used_count' => $coupon->used_count,
            'is_active' => $coupon->is_active,
            'is_usable' => $coupon->isUsableAt(),
            'created_at' => $coupon->created_at?->toIso8601String(),
        ];
    }
}
