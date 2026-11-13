<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Brand
    |--------------------------------------------------------------------------
    |
    | Public identity of the house. Every value here is a working placeholder
    | until the client provides the final legal and contact details.
    |
    */

    'brand' => [
        'name' => 'Luphéra',
        'tagline' => 'Avancer sans bruit, laisser une trace d\'or.',
        'currency' => 'MAD',
        'country' => 'MA',
        'whatsapp' => env('LUPHERA_WHATSAPP', '[à compléter]'),
        'email' => env('LUPHERA_EMAIL', '[à compléter]'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Commerce defaults
    |--------------------------------------------------------------------------
    |
    | These are seed values. From phase 1 onwards the shop reads them from the
    | `settings` table and the admin can change them without a deployment.
    |
    */

    'shipping' => [
        'flat_fee_cents' => 3500,
        'free_threshold_cents' => 80000,
        'default_delay' => '24 à 72 h',
    ],

    'tax' => [
        'included' => true,
        'label' => 'TTC',
    ],

    /*
    |--------------------------------------------------------------------------
    | AI guardrails
    |--------------------------------------------------------------------------
    |
    | Hard ceilings so a bug or an abusive session can never produce an
    | unbounded bill. Tokens are counted per conversation and per day.
    |
    */

    'ai' => [
        'enabled' => env('LUPHERA_AI_ENABLED', false),
        'daily_token_budget' => (int) env('LUPHERA_AI_DAILY_TOKENS', 200000),
        'max_tokens_per_reply' => 500,
        'cache_ttl_seconds' => 86400,
    ],

    /*
    |--------------------------------------------------------------------------
    | Media
    |--------------------------------------------------------------------------
    */

    'media' => [
        'disk' => env('LUPHERA_MEDIA_DISK', 'public'),
        'max_upload_kb' => 5120,
        'accepted_mimes' => ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    ],

];
