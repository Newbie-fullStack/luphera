<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('line', 16)->index();
            $table->string('family', 64)->index();
            $table->string('tag', 32)->nullable();
            $table->string('short_description', 200);
            $table->text('description');
            $table->string('status', 16)->default('draft')->index();
            $table->unsignedTinyInteger('intensity')->nullable();
            $table->unsignedTinyInteger('longevity')->nullable();
            $table->unsignedTinyInteger('sillage')->nullable();
            $table->string('season', 64)->nullable();
            $table->string('occasion', 64)->nullable();
            $table->unsignedInteger('from_price_cents')->default(0)->index();
            $table->unsignedSmallInteger('position')->default(0)->index();
            $table->boolean('is_demo')->default(true);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('product_variants', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('label', 32)->nullable();
            $table->unsignedSmallInteger('size_ml');
            $table->unsignedInteger('price_cents');
            $table->unsignedInteger('compare_at_price_cents')->nullable();
            $table->unsignedInteger('stock')->default(0);
            $table->unsignedSmallInteger('low_stock_threshold')->default(5);
            $table->boolean('is_default')->default(false);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'position']);
            $table->index('price_cents');
        });

        Schema::create('product_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('level', 8);
            $table->string('name', 80);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'level', 'position']);
            $table->index('name');
        });

        Schema::create('product_media', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('type', 16)->default('photo');
            $table->string('url', 500);
            $table->string('alt', 200);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'type', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('product_notes');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
    }
};
