<?php

namespace App\Domain\Commerce\Models;

use App\Domain\Commerce\Enums\CouponType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A single-use-per-order discount code.
 *
 * All amounts are integer centimes. The discount is always computed on the
 * server, from the database, never from a value sent by the client.
 */
class Coupon extends Model
{
    protected $fillable = [
        'code',
        'type',
        'value',
        'max_discount_cents',
        'min_subtotal_cents',
        'starts_at',
        'ends_at',
        'max_uses',
        'used_count',
        'is_active',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'type' => CouponType::class,
        'value' => 'integer',
        'max_discount_cents' => 'integer',
        'min_subtotal_cents' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'max_uses' => 'integer',
        'used_count' => 'integer',
        'is_active' => 'boolean',
    ];

    public function isUsableAt(?Carbon $moment = null): bool
    {
        $moment ??= now();

        if (! $this->is_active) {
            return false;
        }

        if ($this->starts_at !== null && $this->starts_at->greaterThan($moment)) {
            return false;
        }

        if ($this->ends_at !== null && $this->ends_at->lessThan($moment)) {
            return false;
        }

        return $this->max_uses === null || $this->used_count < $this->max_uses;
    }

    public function meetsMinimum(int $subtotalCents): bool
    {
        return $subtotalCents >= $this->min_subtotal_cents;
    }

    public function discountFor(int $subtotalCents): int
    {
        $raw = $this->type === CouponType::Percentage
            ? intdiv($subtotalCents * $this->value, 100)
            : $this->value;

        if ($this->max_discount_cents !== null) {
            $raw = min($raw, $this->max_discount_cents);
        }

        return max(0, min($raw, $subtotalCents));
    }
}
