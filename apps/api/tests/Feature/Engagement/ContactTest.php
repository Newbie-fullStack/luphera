<?php

use App\Domain\Engagement\Models\ContactMessage;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function contactPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Salma Bennani',
        'email' => 'salma@example.test',
        'phone' => '06 12 34 56 78',
        'subject' => 'Question livraison',
        'message' => 'Bonjour, quel est le délai de livraison à Fès ?',
    ], $overrides);
}

it('stores a contact message with a normalised phone number', function (): void {
    $this->postJson('/api/v1/contact', contactPayload())
        ->assertCreated()
        ->assertJsonPath('data.received', true);

    $message = ContactMessage::query()->firstOrFail();

    expect($message->name)->toBe('Salma Bennani')
        ->and($message->phone)->toBe('+212612345678')
        ->and($message->status)->toBe(ContactMessage::STATUS_NEW)
        ->and($message->user_id)->toBeNull()
        ->and($message->ip)->not->toBeNull();
});

it('attaches the message to a logged-in customer', function (): void {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/contact', contactPayload())->assertCreated();

    expect(ContactMessage::query()->firstOrFail()->user_id)->toBe($user->id);
});

it('rejects a filled honeypot without storing anything', function (): void {
    $this->postJson('/api/v1/contact', contactPayload(['website' => 'https://spam.example']))
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');

    expect(ContactMessage::query()->count())->toBe(0);
});

it('validates the message body and the e-mail', function (): void {
    $response = $this->postJson('/api/v1/contact', contactPayload([
        'email' => 'not-an-email',
        'message' => 'Trop court',
    ]))
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');

    expect($response->json('errors.fields'))->toHaveKeys(['email', 'message']);
});

it('throttles repeated submissions from the same address', function (): void {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/contact', contactPayload(['message' => 'Message numéro '.$attempt.' assez long.']))
            ->assertCreated();
    }

    $this->postJson('/api/v1/contact', contactPayload())
        ->assertStatus(429)
        ->assertJsonPath('errors.code', 'rate_limited');
});
