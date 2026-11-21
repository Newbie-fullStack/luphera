<?php

use App\Domain\Admin\Models\AuditLog;
use App\Domain\Engagement\Models\ContactMessage;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function messageFor(array $overrides = []): ContactMessage
{
    return ContactMessage::query()->create(array_merge([
        'name' => 'Youssef El Amrani',
        'email' => 'youssef@example.test',
        'phone' => '+212600000011',
        'subject' => 'Question sur la livraison',
        'body' => 'Quel est le délai de livraison à Fès ?',
        'status' => ContactMessage::STATUS_NEW,
        'ip' => '127.0.0.1',
    ], $overrides));
}

it('lets support read the inbox and move a message to replied', function (): void {
    $message = messageFor();

    Sanctum::actingAs(staffUser('support'));

    $this->getJson('/api/v1/admin/messages')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('meta.new_count', 1)
        ->assertJsonPath('data.0.subject', 'Question sur la livraison');

    $this->getJson('/api/v1/admin/messages/'.$message->getKey())
        ->assertOk()
        ->assertJsonPath('data.body', 'Quel est le délai de livraison à Fès ?');

    $this->patchJson('/api/v1/admin/messages/'.$message->getKey(), ['status' => 'replied'])
        ->assertOk()
        ->assertJsonPath('data.status', 'replied');

    $message->refresh();

    expect($message->read_at)->not->toBeNull()
        ->and($message->replied_at)->not->toBeNull()
        ->and(AuditLog::query()->where('action', 'message.updated')->count())->toBe(1);
});

it('filters messages by status and search term', function (): void {
    messageFor();
    messageFor(['name' => 'Salma Bennani', 'email' => 'salma@example.test', 'status' => 'archived']);

    Sanctum::actingAs(staffUser('manager'));

    expect($this->getJson('/api/v1/admin/messages?status=new')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/v1/admin/messages?q=salma')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/v1/admin/messages?status=archived')->json('data.0.name'))->toBe('Salma Bennani');
});

it('refuses the inbox to a customer session', function (): void {
    $customer = User::factory()->create();
    $customer->assignRole('customer');

    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/admin/messages')
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');
});

it('validates the status transition', function (): void {
    $message = messageFor();

    Sanctum::actingAs(staffUser('admin'));

    $response = $this->patchJson('/api/v1/admin/messages/'.$message->getKey(), ['status' => 'inconnu'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error');

    expect($response->json('errors.fields'))->toHaveKey('status');
});
