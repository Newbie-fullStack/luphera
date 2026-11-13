<?php

namespace App\Support;

/**
 * Moroccan phone numbers.
 *
 * Accepted inputs: +212XXXXXXXXX, 00212XXXXXXXXX and 0XXXXXXXXX.
 * Everything is stored normalised as +212XXXXXXXXX.
 */
final class Phone
{
    public const PATTERN = '/^(\+212|00212|0)[5-7]\d{8}$/';

    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/[\s.\-()]/', '', trim($phone)) ?? '';

        if (str_starts_with($digits, '00212')) {
            return '+212'.substr($digits, 5);
        }

        if (str_starts_with($digits, '+212')) {
            return $digits;
        }

        if (str_starts_with($digits, '0')) {
            return '+212'.substr($digits, 1);
        }

        return $digits;
    }

    public static function isValid(string $phone): bool
    {
        return preg_match(self::PATTERN, preg_replace('/[\s.\-()]/', '', trim($phone)) ?? '') === 1;
    }

    /**
     * Display format used in the interface: 06 12 34 56 78.
     */
    public static function format(string $phone): string
    {
        $normalized = self::normalize($phone);
        $local = str_starts_with($normalized, '+212') ? '0'.substr($normalized, 4) : $normalized;

        return trim(chunk_split($local, 2, ' '));
    }
}
