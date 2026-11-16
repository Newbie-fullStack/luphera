<?php

namespace App\Support;

/**
 * Amounts are stored as integer centimes. Documents (PDF) need a stable
 * French formatting independent from the front-end Intl implementation.
 */
final class Money
{
    public static function format(int $cents): string
    {
        return number_format($cents / 100, 2, ',', ' ').' MAD';
    }
}
