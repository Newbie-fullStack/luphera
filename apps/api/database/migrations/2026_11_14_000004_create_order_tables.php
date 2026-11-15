<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('number', 24)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 24)->default('pending')->index();
            $table->string('customer_name', 120);
            $table->string('phone', 20)->index();
            $table->string('email', 190)->nullable();
            $table->json('address');
            $table->string('note', 500)->nullable();
            $table->unsignedInteger('subtotal_cents');
            $table->unsignedInteger('discount_cents')->default(0);
            $table->unsignedInteger('shipping_cents')->default(0);
            $table->unsignedInteger('total_cents');
            $table->string('coupon_code', 32)->nullable();
            $table->string('payment_method', 16)->default('cod');
            $table->string('idempotency_key', 80)->nullable()->unique();
            $table->string('tracking_token', 64)->unique();
            $table->timestamp('placed_at')->index();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_slug', 120);
            $table->string('product_name', 160);
            $table->string('variant_label', 40)->nullable();
            $table->string('sku', 64);
            $table->unsignedInteger('unit_price_cents');
            $table->unsignedSmallInteger('quantity');
            $table->unsignedInteger('line_total_cents');
            $table->timestamps();
        });

        Schema::create('order_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('status', 24);
            $table->string('author', 80)->nullable();
            $table->string('comment', 300)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['order_id', 'created_at']);
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('method', 16)->default('cod');
            $table->string('status', 16)->default('pending');
            $table->unsignedInteger('amount_cents');
            $table->string('reference', 120)->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
        });

        Schema::create('shipments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('carrier', 80)->nullable();
            $table->string('tracking_number', 80)->nullable();
            $table->string('status', 24)->default('pending');
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('quantity');
            $table->string('reason', 16);
            $table->string('author', 80)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_variant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
