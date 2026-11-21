<?php

use App\Domain\Admin\Models\AuditLog;
use App\Domain\Catalog\Models\Product;
use App\Domain\Engagement\Models\Review;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed([RolesAndPermissionsSeeder::class, CatalogSeeder::class]);
});

function moderationReview(array $overrides = []): Review
{
    $product = Product::query()->where('slug', 'luphera-noir')->firstOrFail();

    return Review::query()->create(array_merge([
        'product_id' => $product->id,
        'user_id' => User::factory()->create()->id,
        'rating' => 5,
        'title' => 'Sillage tenace',
        'body' => 'Un parfum qui tient toute la journée.',
        'author_name' => 'Salma B.',
        'status' => Review::STATUS_PENDING,
    ], $overrides));
}

it('publishes an approved review on the storefront', function (): void {
    $review = moderationReview();

    Sanctum::actingAs(staffUser('support'));

    $this->getJson('/api/v1/admin/reviews')
        ->assertOk()
        ->assertJsonPath('meta.pending_count', 1)
        ->assertJsonPath('data.0.status', 'pending');

    $this->patchJson('/api/v1/admin/reviews/'.$review->getKey(), ['status' => 'approved'])
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.product.slug', 'luphera-noir');

    expect(AuditLog::query()->where('action', 'review.moderated')->count())->toBe(1);

    $this->getJson('/api/v1/products/luphera-noir/reviews')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.author', 'Salma B.');
});

it('keeps a rejected review hidden', function (): void {
    $review = moderationReview();

    Sanctum::actingAs(staffUser('manager'));

    $this->patchJson('/api/v1/admin/reviews/'.$review->getKey(), [
        'status' => 'rejected',
        'moderation_note' => 'Contenu hors sujet',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.moderation_note', 'Contenu hors sujet');

    $this->getJson('/api/v1/products/luphera-noir/reviews')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('filters reviews by status and search term', function (): void {
    moderationReview();
    moderationReview(['status' => Review::STATUS_APPROVED, 'author_name' => 'Youssef E.']);

    Sanctum::actingAs(staffUser('support'));

    expect($this->getJson('/api/v1/admin/reviews?status=pending')->json('meta.total'))->toBe(1)
        ->and($this->getJson('/api/v1/admin/reviews?q=youssef')->json('meta.total'))->toBe(1);
});

it('refuses moderation to a customer session', function (): void {
    $customer = User::factory()->create();
    $customer->assignRole('customer');

    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/admin/reviews')
        ->assertForbidden()
        ->assertJsonPath('errors.code', 'forbidden');
});
