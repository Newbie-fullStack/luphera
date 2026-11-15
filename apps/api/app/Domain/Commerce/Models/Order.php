<?php

namespace App\Domain\Commerce\Models;

use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Enums\PaymentMethod;
use App\Models\Concerns\HasPublicId;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A placed order. Names, prices and the address are frozen here: changing the
 * catalogue later never rewrites history.
 */
class Order extends Model
{
    use HasPublicId;

    protected $fillable = [
        'number',
        'user_id',
        'status',
        'customer_name',
        'phone',
        'email',
        'address',
        'note',
        'subtotal_cents',
        'discount_cents',
        'shipping_cents',
        'total_cents',
        'coupon_code',
        'payment_method',
        'idempotency_key',
        'tracking_token',
        'placed_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'status' => OrderStatus::class,
        'address' => 'array',
        'subtotal_cents' => 'integer',
        'discount_cents' => 'integer',
        'shipping_cents' => 'integer',
        'total_cents' => 'integer',
        'payment_method' => PaymentMethod::class,
        'placed_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<OrderEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return HasMany<Shipment, $this>
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }
}
