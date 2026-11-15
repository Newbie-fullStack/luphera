<?php

namespace App\Domain\Commerce\Enums;

/**
 * Order lifecycle.
 *
 * Only the transitions declared in `allowedTransitions()` are accepted; every
 * change writes an `order_events` row so the history stays auditable.
 */
enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Preparing = 'preparing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Returned = 'returned';
    case FailedDelivery = 'failed_delivery';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Preparing, self::Cancelled],
            self::Preparing => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered, self::FailedDelivery],
            self::Delivered => [self::Returned],
            self::Cancelled, self::Returned, self::FailedDelivery => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    /**
     * Stock is given back when the order stops before the parcel leaves.
     */
    public function restoresStockOnEnter(): bool
    {
        return in_array($this, [self::Cancelled, self::FailedDelivery, self::Returned], true);
    }

    public function isFinal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    /**
     * Translation key, never a user-facing string.
     */
    public function translationKey(): string
    {
        return 'order.status.'.$this->value;
    }
}
