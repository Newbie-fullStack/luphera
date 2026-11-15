<?php

use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Exceptions\BusinessRuleException;
use App\Domain\Commerce\Models\Order;
use App\Domain\Commerce\Models\OrderEvent;
use App\Domain\Commerce\Models\Payment;
use App\Domain\Commerce\Models\StockMovement;
use App\Domain\Commerce\Services\OrderService;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CommerceSeeder;

beforeEach(function (): void {
    $this->seed(CatalogSeeder::class);
    $this->seed(CommerceSeeder::class);
});

it('places an order, freezes the lines and decrements the stock', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30', 2);

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated();

    $number = $response->json('data.number');

    expect($number)->toMatch('/^LPH-\d{6}-\d{4}$/');

    $response
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.customer.phone', '+212612345678')
        ->assertJsonPath('data.address.city', 'Casablanca')
        ->assertJsonPath('data.items.0.product_slug', 'luphera-noir')
        ->assertJsonPath('data.items.0.quantity', 2)
        ->assertJsonPath('data.items.0.unit_price_cents', 45000)
        ->assertJsonPath('data.totals.subtotal_cents', 90000)
        ->assertJsonPath('data.totals.shipping_cents', 0)
        ->assertJsonPath('data.totals.total_cents', 90000)
        ->assertJsonPath('data.payment_method', 'cod')
        ->assertJsonPath('data.events.0.status', 'pending')
        ->assertJsonPath('errors', []);

    expect($response->json('data.tracking.token'))->toBeString()->toHaveLength(40);
    expect($response->headers->get('X-Order-Number'))->toBe($number);

    expect(variantBySku('LPH-NOIR-30')->stock)->toBe(16)
        ->and(Payment::query()->count())->toBe(1)
        ->and(OrderEvent::query()->count())->toBe(1)
        ->and(StockMovement::query()->count())->toBe(1)
        ->and(StockMovement::query()->first()->quantity)->toBe(-2);

    $this->withHeader('X-Cart-Token', $token)
        ->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.item_count', 0);
});

it('is idempotent for a repeated checkout', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-50', 1);

    $first = $this->withHeader('X-Cart-Token', $token)
        ->withHeader('Idempotency-Key', 'checkout-demo-1')
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated();

    $second = $this->withHeader('X-Cart-Token', $token)
        ->withHeader('Idempotency-Key', 'checkout-demo-1')
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated();

    expect($second->json('data.number'))->toBe($first->json('data.number'))
        ->and(Order::query()->count())->toBe(1)
        ->and(variantBySku('LPH-NOIR-50')->stock)->toBe(11)
        ->and(StockMovement::query()->count())->toBe(1);
});

it('refuses to oversell the last bottles', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-100', 1);

    ProductVariant::query()->where('sku', 'LPH-NOIR-100')->update(['stock' => 0]);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'insufficient_stock')
        ->assertJsonPath('errors.fields.items.0', fn (string $message): bool => $message !== '');

    expect(Order::query()->count())->toBe(0)
        ->and(variantBySku('LPH-NOIR-100')->stock)->toBe(0);
});

it('refuses an empty cart', function (): void {
    $this->withHeader('X-Cart-Token', cartToken($this))
        ->postJson('/api/v1/orders', orderPayload())
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'cart_empty');

    expect(Order::query()->count())->toBe(0);
});

it('validates the checkout form in French', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30', 1);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload([
            'phone' => '01 02 03 04 05',
            'terms' => false,
        ]))
        ->assertUnprocessable()
        ->assertJsonPath('errors.code', 'validation_error')
        ->assertJsonPath('errors.fields.phone.0', fn (string $message): bool => $message !== '')
        ->assertJsonPath('errors.fields.terms.0', fn (string $message): bool => $message !== '');
});

it('applies the coupon once and counts its use', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30', 2);

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart/coupon', ['code' => 'LUPHERA10'])
        ->assertOk();

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated()
        ->assertJsonPath('data.coupon_code', 'LUPHERA10')
        ->assertJsonPath('data.totals.discount_cents', 9000)
        ->assertJsonPath('data.totals.total_cents', 81000);

    expect(Order::query()->count())->toBe(1);
});

it('restores the stock when the order is cancelled', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-50', 2);

    $number = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated()
        ->json('data.number');

    $order = Order::query()->where('number', $number)->firstOrFail();
    $order->load('items');

    expect(variantBySku('LPH-NOIR-50')->stock)->toBe(10);

    app(OrderService::class)->transition($order, OrderStatus::Cancelled, 'admin', 'Client injoignable');

    expect(variantBySku('LPH-NOIR-50')->stock)->toBe(12)
        ->and($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and(StockMovement::query()->where('quantity', 2)->count())->toBe(1)
        ->and(OrderEvent::query()->where('status', 'cancelled')->count())->toBe(1);
});

it('walks the whole lifecycle and returns the stock at the end', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30', 1);

    $number = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->json('data.number');

    $order = Order::query()->where('number', $number)->firstOrFail();
    $service = app(OrderService::class);

    foreach ([OrderStatus::Confirmed, OrderStatus::Preparing, OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Returned] as $status) {
        $order = $service->transition($order, $status, 'admin');
    }

    expect($order->status)->toBe(OrderStatus::Returned)
        ->and(OrderEvent::query()->count())->toBe(6)
        ->and(variantBySku('LPH-NOIR-30')->stock)->toBe(18);
});

it('refuses an impossible status transition', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30', 1);

    $number = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->json('data.number');

    $order = Order::query()->where('number', $number)->firstOrFail();

    expect(fn () => app(OrderService::class)->transition($order, OrderStatus::Shipped))
        ->toThrow(BusinessRuleException::class);
});

it('protects the tracking page with a token or the phone', function (): void {
    $token = cartToken($this);
    addToCart($this, $token, 'LPH-NOIR-30', 1);

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/orders', orderPayload())
        ->assertCreated();

    $number = $response->json('data.number');
    $trackingToken = $response->json('data.tracking.token');

    $this->getJson('/api/v1/orders/'.$number)
        ->assertNotFound()
        ->assertJsonPath('errors.code', 'not_found');

    $this->getJson('/api/v1/orders/'.$number.'?phone='.rawurlencode('06 99 99 99 99'))
        ->assertNotFound();

    $this->getJson('/api/v1/orders/'.$number.'?token='.$trackingToken)
        ->assertOk()
        ->assertJsonPath('data.number', $number)
        ->assertJsonPath('data.tracking', null);

    $this->getJson('/api/v1/orders/'.$number.'?phone='.rawurlencode('06 12 34 56 78'))
        ->assertOk()
        ->assertJsonPath('data.number', $number);
});

it('returns 404 for an unknown order number', function (): void {
    $this->getJson('/api/v1/orders/LPH-000000-0000?token=inconnu')
        ->assertNotFound()
        ->assertJsonPath('errors.code', 'not_found');
});
