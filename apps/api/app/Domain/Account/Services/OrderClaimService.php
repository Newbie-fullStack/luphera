<?php

namespace App\Domain\Account\Services;

use App\Domain\Commerce\Models\Order;
use App\Models\User;

/**
 * Links a new account to the guest orders placed with the same phone.
 *
 * Claiming only happens at registration: a phone is enough to create an
 * account, so doing it on every login would let anyone who knows a customer's
 * phone number read their order history. SMS verification is required before
 * this becomes a verified link — tracked in docs/DECISIONS.md.
 */
final class OrderClaimService
{
    public function claimFor(User $user): int
    {
        return Order::query()
            ->whereNull('user_id')
            ->whereNull('claimed_at')
            ->where('phone', $user->phone)
            ->update([
                'user_id' => $user->id,
                'claimed_at' => now(),
            ]);
    }
}
