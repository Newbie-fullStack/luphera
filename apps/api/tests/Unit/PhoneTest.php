<?php

use App\Support\Phone;

it('normalises every accepted Moroccan format', function (string $input, string $expected): void {
    expect(Phone::normalize($input))->toBe($expected);
})->with([
    ['0612345678', '+212612345678'],
    ['06 12 34 56 78', '+212612345678'],
    ['+212612345678', '+212612345678'],
    ['00212612345678', '+212612345678'],
    ['0712345678', '+212712345678'],
]);

it('rejects invalid numbers', function (string $input): void {
    expect(Phone::isValid($input))->toBeFalse();
})->with([
    '061234567',
    '06123456789',
    '0212345678',
    'not-a-phone',
    '+33612345678',
]);

it('accepts valid numbers with separators', function (): void {
    expect(Phone::isValid('06 12 34 56 78'))->toBeTrue()
        ->and(Phone::isValid('+212 612-345-678'))->toBeTrue();
});

it('formats a number for display', function (): void {
    expect(Phone::format('+212612345678'))->toBe('06 12 34 56 78');
});
