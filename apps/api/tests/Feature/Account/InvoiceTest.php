<?php

use App\Domain\Commerce\Models\OrderItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('requires a session to download an invoice', function (): void {
    $order = orderFor(null);

    $this->getJson('/api/v1/me/orders/'.$order->number.'/invoice')->assertUnauthorized();
});

it('downloads the invoice of a delivered order as a PDF', function (): void {
    $user = User::factory()->create(['phone' => '+212612345678']);
    $order = orderFor($user, ['status' => 'delivered']);

    OrderItem::query()->create([
        'order_id' => $order->id,
        'product_slug' => 'luphera-noir',
        'product_name' => 'Luphéra Noir',
        'variant_label' => '50 ml',
        'sku' => 'LPH-NOIR-50',
        'unit_price_cents' => 69000,
        'quantity' => 1,
        'line_total_cents' => 69000,
    ]);

    Sanctum::actingAs($user);

    $response = $this->get('/api/v1/me/orders/'.$order->number.'/invoice');

    $response->assertOk();
    $response->assertDownload('facture-'.$order->number.'.pdf');
    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect($response->getContent())->toStartWith('%PDF');
});

it('refuses the invoice of an order that is not delivered yet', function (): void {
    $user = User::factory()->create();
    $order = orderFor($user, ['status' => 'shipped']);

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/me/orders/'.$order->number.'/invoice')
        ->assertStatus(422)
        ->assertJsonPath('errors.code', 'invoice_unavailable');
});

it('never delivers the invoice of another customer', function (): void {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $order = orderFor($owner, ['status' => 'delivered']);

    Sanctum::actingAs($intruder);

    $this->getJson('/api/v1/me/orders/'.$order->number.'/invoice')->assertNotFound();
});
