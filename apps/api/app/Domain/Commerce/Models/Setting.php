<?php

namespace App\Domain\Commerce\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Shop-wide settings editable from the admin.
 *
 * Values are cached for an hour; `set()` clears the entry so a change is
 * visible on the next request.
 */
class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = Cache::remember('setting.'.$key, 3600, function () use ($key): ?string {
            $row = self::query()->where('key', $key)->first();

            return $row?->value;
        });

        return $value ?? $default;
    }

    public static function getInt(string $key, int $default): int
    {
        $value = self::get($key);

        return $value === null || ! is_numeric($value) ? $default : (int) $value;
    }

    public static function set(string $key, string $value): void
    {
        self::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('setting.'.$key);
    }
}
