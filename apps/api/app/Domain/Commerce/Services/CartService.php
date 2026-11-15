<?php

namespace App\Domain\Commerce\Services;

use App\Domain\Catalog\Enums\ProductStatus;
use App\Domain\Catalog\Models\ProductVariant;
use App\Domain\Commerce\Exceptions\BusinessRuleException;
use App\Domain\Commerce\Models\Cart;
use App\Domain\Commerce\Models\CartItem;
use App\Domain\Commerce\Models\Coupon;
use App\Models\User;

/**
 * Cart lifecycle: guest token, items, coupon.
 *
 * Quantities are validated against the live stock here, but the authoritative
 * check happens again inside the order transaction with a row lock.
 */
final class CartService
{
    public function __construct(private readonly PricingService $pricing) {}

    public function resolve(?string $token, ?User $user = null): Cart
    {
        if ($user !== null) {
            $cart = Cart::query()
                ->where('user_id', $user->getKey())
                ->latest('id')
                ->first();

            if ($cart !== null) {
                return $this->load($cart);
            }
        }

        if ($token !== null && $token !== '') {
            $cart = Cart::query()->where('public_id', $token)->first();

            if ($cart !== null) {
                return $this->load($cart);
            }
        }

        return $this->load(Cart::query()->create(['user_id' => $user?->getKey()]));
    }

    public function load(Cart $cart): Cart
    {
        return $cart->load([
            'coupon',
            'items.variant.product.media',
        ]);
    }

    public function addItem(Cart $cart, string $variantPublicId, int $quantity): CartItem
    {
        $variant = ProductVariant::query()
            ->where('public_id', $variantPublicId)
            ->whereHas('product', fn ($query) => $query->where('status', ProductStatus::Active->value))
            ->first();

        if ($variant === null) {
            throw new BusinessRuleException(
                'variant_not_found',
                "Cette contenance n'est plus disponible.",
                ['variant_id' => ['Cette contenance est introuvable.']],
                404,
            );
        }

        $item = $cart->items()
            ->where('product_variant_id', $variant->getKey())
            ->first();

        $nextQuantity = $quantity;

        if ($item !== null) {
            $nextQuantity += $item->quantity;
        }

        $this->assertQuantityAllowed($variant, $nextQuantity);

        if ($item !== null) {
            $item->update(['quantity' => $nextQuantity]);
        } else {
            $item = $cart->items()->create([
                'product_variant_id' => $variant->getKey(),
                'quantity' => $nextQuantity,
            ]);
        }

        return $item;
    }

    public function updateItem(CartItem $item, int $quantity): void
    {
        if ($quantity === 0) {
            $item->delete();

            return;
        }

        $this->assertQuantityAllowed($item->variant, $quantity);

        $item->update(['quantity' => $quantity]);
    }

    public function removeItem(CartItem $item): void
    {
        $item->delete();
    }

    public function applyCoupon(Cart $cart, string $code): Coupon
    {
        $coupon = Coupon::query()
            ->where('code', strtoupper(trim($code)))
            ->first();

        if ($coupon === null) {
            throw new BusinessRuleException(
                'coupon_not_found',
                "Ce code promo n'existe pas.",
                ['code' => ['Ce code promo est inconnu.']],
            );
        }

        if (! $coupon->isUsableAt()) {
            throw new BusinessRuleException(
                'coupon_unavailable',
                "Ce code promo n'est plus valable.",
                ['code' => ["Ce code promo n'est plus valable."]],
            );
        }

        $subtotal = $this->pricing->cartSubtotalCents($cart);

        if (! $coupon->meetsMinimum($subtotal)) {
            throw new BusinessRuleException(
                'coupon_minimum',
                'Le panier est en dessous du minimum requis pour ce code.',
                ['code' => ['Le montant du panier est insuffisant pour ce code.']],
            );
        }

        $cart->coupon()->associate($coupon);
        $cart->save();

        return $coupon;
    }

    public function removeCoupon(Cart $cart): void
    {
        $cart->coupon()->dissociate();
        $cart->save();
    }

    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
        $cart->coupon()->dissociate();
        $cart->save();
    }

    private function assertQuantityAllowed(ProductVariant $variant, int $quantity): void
    {
        if ($quantity > PricingService::MAX_LINE_QUANTITY) {
            throw new BusinessRuleException(
                'quantity_limit',
                'Maximum '.PricingService::MAX_LINE_QUANTITY.' pièces par contenance.',
                ['quantity' => ['Maximum '.PricingService::MAX_LINE_QUANTITY.' pièces par contenance.']],
            );
        }

        if ($variant->stock <= 0) {
            throw new BusinessRuleException(
                'out_of_stock',
                'Cette contenance est épuisée.',
                ['quantity' => ['Cette contenance est épuisée.']],
            );
        }

        if ($quantity > $variant->stock) {
            throw new BusinessRuleException(
                'insufficient_stock',
                'Il ne reste que '.$variant->stock.' pièce(s) pour cette contenance.',
                ['quantity' => ['Il ne reste que '.$variant->stock.' pièce(s).']],
            );
        }
    }
}
