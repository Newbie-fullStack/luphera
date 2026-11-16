<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 40)->nullable();
            $table->string('recipient_name', 120);
            $table->string('phone', 20);
            $table->foreignId('city_id')->constrained()->restrictOnDelete();
            $table->string('district', 80);
            $table->string('line1', 200);
            $table->string('landmark', 120)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });

        Schema::create('wishlist_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
        });

        Schema::table('orders', function (Blueprint $table): void {
            // Guest orders are claimed by their owner at registration. The
            // timestamp keeps the claim auditable instead of silently moving
            // rows between accounts.
            $table->timestamp('claimed_at')->nullable()->after('user_id');
            $table->index(['user_id', 'placed_at']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('marketing_opt_in')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('marketing_opt_in');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'placed_at']);
            $table->dropColumn('claimed_at');
        });

        Schema::dropIfExists('wishlist_items');
        Schema::dropIfExists('addresses');
    }
};
