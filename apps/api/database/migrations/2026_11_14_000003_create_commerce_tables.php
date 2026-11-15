<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name', 80)->unique();
            $table->unsignedInteger('shipping_fee_cents');
            $table->string('delivery_days', 40);
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 80)->unique();
            $table->text('value');
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('type', 16);
            $table->unsignedInteger('value');
            $table->unsignedInteger('max_discount_cents')->nullable();
            $table->unsignedInteger('min_subtotal_cents')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('carts', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index('user_id');
        });

        Schema::create('cart_items', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('quantity');
            $table->timestamps();

            $table->unique(['cart_id', 'product_variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('cities');
    }
};
