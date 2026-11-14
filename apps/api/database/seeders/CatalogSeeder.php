<?php

namespace Database\Seeders;

use App\Domain\Catalog\Enums\MediaType;
use App\Domain\Catalog\Enums\NoteLevel;
use App\Domain\Catalog\Enums\ProductLine;
use App\Domain\Catalog\Enums\ProductStatus;
use App\Domain\Catalog\Models\Bundle;
use App\Domain\Catalog\Models\BundleItem;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\ProductMedia;
use App\Domain\Catalog\Models\ProductNote;
use App\Domain\Catalog\Models\ProductVariant;
use Illuminate\Database\Seeder;

/**
 * Demonstration catalogue.
 *
 * Every price, stock and description below is seed data copied from the design
 * reference. The API flags these products with `is_demo` so the storefront can
 * say so; nothing here is a claim about the real collection.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->definitions() as $index => $definition) {
            $product = Product::withTrashed()->updateOrCreate(
                ['slug' => $definition['slug']],
                [
                    'name' => $definition['name'],
                    'line' => $definition['line'],
                    'family' => $definition['family'],
                    'tag' => $definition['tag'],
                    'short_description' => $definition['short'],
                    'description' => $definition['description'],
                    'status' => ProductStatus::Active,
                    'intensity' => $definition['intensity'],
                    'longevity' => $definition['longevity'],
                    'sillage' => $definition['sillage'],
                    'season' => $definition['season'],
                    'occasion' => $definition['occasion'],
                    'position' => $index + 1,
                    'is_demo' => true,
                    'seo_title' => $definition['name'].' — eau de parfum | Luphéra',
                    'seo_description' => $definition['short'],
                    'published_at' => now(),
                ],
            );

            if ($product->trashed()) {
                $product->restore();
            }

            $variants = $this->seedVariants($product, $definition['variants']);
            $this->seedNotes($product, $definition['notes']);
            $this->seedMedia($product, $definition['media']);

            $product->update([
                'from_price_cents' => min(array_column($definition['variants'], 'price_cents')),
            ]);

            if (isset($definition['bundle'])) {
                $this->seedBundle($product, $definition['bundle']);
            }
        }
    }

    /**
     * @param list<array{sku: string, label: string, size_ml: int, price_cents: int, stock: int, is_default?: bool}> $definitions
     * @return array<string, ProductVariant>
     */
    private function seedVariants(Product $product, array $definitions): array
    {
        ProductVariant::withTrashed()
            ->where('product_id', $product->getKey())
            ->forceDelete();

        $variants = [];

        foreach ($definitions as $position => $definition) {
            $variants[$definition['sku']] = ProductVariant::create([
                'product_id' => $product->getKey(),
                'sku' => $definition['sku'],
                'label' => $definition['label'],
                'size_ml' => $definition['size_ml'],
                'price_cents' => $definition['price_cents'],
                'stock' => $definition['stock'],
                'low_stock_threshold' => 5,
                'is_default' => $definition['is_default'] ?? false,
                'position' => $position,
            ]);
        }

        return $variants;
    }

    /**
     * @param array{top: list<string>, heart: list<string>, base: list<string>} $pyramid
     */
    private function seedNotes(Product $product, array $pyramid): void
    {
        ProductNote::query()->where('product_id', $product->getKey())->delete();

        $position = 0;

        foreach (['top' => NoteLevel::Top, 'heart' => NoteLevel::Heart, 'base' => NoteLevel::Base] as $key => $level) {
            foreach ($pyramid[$key] as $name) {
                ProductNote::create([
                    'product_id' => $product->getKey(),
                    'level' => $level,
                    'name' => $name,
                    'position' => $position++,
                ]);
            }
        }
    }

    /**
     * @param list<array{url: string, alt: string}> $media
     */
    private function seedMedia(Product $product, array $media): void
    {
        ProductMedia::query()->where('product_id', $product->getKey())->delete();

        foreach ($media as $position => $item) {
            ProductMedia::create([
                'product_id' => $product->getKey(),
                'type' => MediaType::Photo,
                'url' => $item['url'],
                'alt' => $item['alt'],
                'position' => $position,
            ]);
        }
    }

    /**
     * @param array{name: string, items: list<array{label: string, quantity?: int, variant?: string}>} $definition
     */
    private function seedBundle(Product $product, array $definition): void
    {
        $bundle = Bundle::query()->updateOrCreate(
            ['product_id' => $product->getKey()],
            ['name' => $definition['name']],
        );

        BundleItem::query()->where('bundle_id', $bundle->getKey())->delete();

        foreach ($definition['items'] as $position => $item) {
            $variantId = isset($item['variant'])
                ? ProductVariant::query()->where('sku', $item['variant'])->value('id')
                : null;

            BundleItem::create([
                'bundle_id' => $bundle->getKey(),
                'variant_id' => $variantId,
                'label' => $item['label'],
                'quantity' => $item['quantity'] ?? 1,
                'position' => $position,
            ]);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function definitions(): array
    {
        $standard = [
            ['sku' => 'LPH-NOIR-30', 'label' => '30 ml', 'size_ml' => 30, 'price_cents' => 45000, 'stock' => 18],
            ['sku' => 'LPH-NOIR-50', 'label' => '50 ml', 'size_ml' => 50, 'price_cents' => 69000, 'stock' => 12, 'is_default' => true],
            ['sku' => 'LPH-NOIR-100', 'label' => '100 ml', 'size_ml' => 100, 'price_cents' => 99000, 'stock' => 6],
        ];

        $standardAmbre = [
            ['sku' => 'LPH-AMBRE-30', 'label' => '30 ml', 'size_ml' => 30, 'price_cents' => 45000, 'stock' => 15],
            ['sku' => 'LPH-AMBRE-50', 'label' => '50 ml', 'size_ml' => 50, 'price_cents' => 69000, 'stock' => 10, 'is_default' => true],
            ['sku' => 'LPH-AMBRE-100', 'label' => '100 ml', 'size_ml' => 100, 'price_cents' => 99000, 'stock' => 4],
        ];

        $standardAurore = [
            ['sku' => 'LPH-AURORE-30', 'label' => '30 ml', 'size_ml' => 30, 'price_cents' => 45000, 'stock' => 20],
            ['sku' => 'LPH-AURORE-50', 'label' => '50 ml', 'size_ml' => 50, 'price_cents' => 69000, 'stock' => 14, 'is_default' => true],
            ['sku' => 'LPH-AURORE-100', 'label' => '100 ml', 'size_ml' => 100, 'price_cents' => 99000, 'stock' => 8],
        ];

        $standardSoie = [
            ['sku' => 'LPH-SOIE-30', 'label' => '30 ml', 'size_ml' => 30, 'price_cents' => 45000, 'stock' => 16],
            ['sku' => 'LPH-SOIE-50', 'label' => '50 ml', 'size_ml' => 50, 'price_cents' => 69000, 'stock' => 11, 'is_default' => true],
            ['sku' => 'LPH-SOIE-100', 'label' => '100 ml', 'size_ml' => 100, 'price_cents' => 99000, 'stock' => 5],
        ];

        return [
            [
                'slug' => 'luphera-noir',
                'name' => 'Luphéra Noir',
                'line' => ProductLine::Homme,
                'family' => 'Boisé cuiré',
                'tag' => 'Best-seller',
                'short' => 'Cuir noir, iris, cèdre.',
                'description' => "Un boisé cuiré sombre et profond. La bergamote et le poivre noir ouvrent sur un cœur de cuir et d'iris, avant un fond d'ambre gris qui reste longtemps.",
                'intensity' => 4,
                'longevity' => 5,
                'sillage' => 4,
                'season' => 'Automne, hiver',
                'occasion' => 'Soirée, bureau',
                'variants' => $standard,
                'notes' => [
                    'top' => ['Bergamote', 'Poivre noir', 'Cardamome'],
                    'heart' => ['Cuir noir', 'Iris', 'Cèdre'],
                    'base' => ['Ambre gris', 'Patchouli', 'Mousse de chêne'],
                ],
                'media' => [
                    ['url' => '/images/flacons/flacon-noir.webp', 'alt' => 'Flacon Luphéra Noir, verre noir et or'],
                ],
            ],
            [
                'slug' => 'luphera-ambre',
                'name' => 'Luphéra Ambre',
                'line' => ProductLine::Homme,
                'family' => 'Ambré épicé',
                'tag' => 'Nouveau',
                'short' => 'Rose turque, oud léger, labdanum.',
                'description' => "Un ambré chaud et épicé. Le safran et la cannelle s'ouvrent sur une rose turque et un oud léger, posés sur une base de vanille noire et de benjoin.",
                'intensity' => 5,
                'longevity' => 5,
                'sillage' => 4,
                'season' => 'Hiver',
                'occasion' => 'Soirée',
                'variants' => $standardAmbre,
                'notes' => [
                    'top' => ['Safran', 'Cannelle', 'Mandarine'],
                    'heart' => ['Rose turque', 'Oud léger', 'Labdanum'],
                    'base' => ['Ambre', 'Benjoin', 'Vanille noire'],
                ],
                'media' => [
                    ['url' => '/images/flacons/flacon-ambre.webp', 'alt' => 'Flacon Luphéra Ambre, verre ambré et or'],
                ],
            ],
            [
                'slug' => 'luphera-aurore',
                'name' => 'Luphéra Aurore',
                'line' => ProductLine::Femme,
                'family' => 'Floral vanillé',
                'tag' => 'Best-seller',
                'short' => 'Rose de Damas, jasmin sambac, iris.',
                'description' => 'Un floral vanillé lumineux. La poire et le poivre rose ouvrent sur une rose de Damas veloutée, portée par une vanille douce et un musc blanc.',
                'intensity' => 4,
                'longevity' => 4,
                'sillage' => 4,
                'season' => 'Printemps, automne',
                'occasion' => 'Journée, soirée',
                'variants' => $standardAurore,
                'notes' => [
                    'top' => ['Poire', 'Bergamote', 'Poivre rose'],
                    'heart' => ['Rose de Damas', 'Jasmin sambac', 'Iris'],
                    'base' => ['Vanille', 'Musc blanc', 'Santal'],
                ],
                'media' => [
                    ['url' => '/images/flacons/flacon-aurore.webp', 'alt' => 'Flacon Luphéra Aurore, verre rosé et or'],
                ],
            ],
            [
                'slug' => 'luphera-soie',
                'name' => 'Luphéra Soie',
                'line' => ProductLine::Femme,
                'family' => 'Poudré musqué',
                'tag' => 'Nouveau',
                'short' => "Iris, héliotrope, fleur d'oranger.",
                'description' => "Un poudré musqué tout en douceur. La mandarine et la fleur de coton laissent place à l'iris et à la fleur d'oranger, sur un musc blanc et un santal crémeux.",
                'intensity' => 3,
                'longevity' => 4,
                'sillage' => 3,
                'season' => "Toute l'année",
                'occasion' => 'Bureau, quotidien',
                'variants' => $standardSoie,
                'notes' => [
                    'top' => ['Mandarine', 'Fleur de coton', 'Poire'],
                    'heart' => ['Iris', 'Héliotrope', "Fleur d'oranger"],
                    'base' => ['Musc blanc', 'Santal', 'Ambrette'],
                ],
                'media' => [
                    ['url' => '/images/flacons/flacon-soie.webp', 'alt' => 'Flacon Luphéra Soie, verre clair et or'],
                ],
            ],
            [
                'slug' => 'coffret-duo',
                'name' => 'Coffret Duo',
                'line' => ProductLine::Coffret,
                'family' => 'Noir + Aurore',
                'tag' => 'Édition limitée',
                'short' => 'Noir et Aurore, réunis dans un écrin noir et or.',
                'description' => 'Deux flacons de 50 ml, Noir et Aurore, réunis dans un écrin noir et or. Le cadeau idéal pour un couple, ou pour se faire plaisir.',
                'intensity' => null,
                'longevity' => null,
                'sillage' => null,
                'season' => null,
                'occasion' => null,
                'variants' => [
                    ['sku' => 'LPH-DUO-2X50', 'label' => '2 × 50 ml', 'size_ml' => 100, 'price_cents' => 119000, 'stock' => 8, 'is_default' => true],
                ],
                'notes' => ['top' => [], 'heart' => [], 'base' => []],
                'media' => [
                    ['url' => '/images/flacons/flacon-noir.webp', 'alt' => 'Coffret Duo Luphéra, flacon Noir'],
                    ['url' => '/images/flacons/flacon-aurore.webp', 'alt' => 'Coffret Duo Luphéra, flacon Aurore'],
                ],
                'bundle' => [
                    'name' => 'Coffret Duo',
                    'items' => [
                        ['label' => 'Luphéra Noir, 50 ml', 'variant' => 'LPH-NOIR-50'],
                        ['label' => 'Luphéra Aurore, 50 ml', 'variant' => 'LPH-AURORE-50'],
                        ['label' => 'Écrin noir et or'],
                    ],
                ],
            ],
            [
                'slug' => 'coffret-decouverte',
                'name' => 'Coffret Découverte',
                'line' => ProductLine::Coffret,
                'family' => '4 × 10 ml',
                'tag' => null,
                'short' => 'Quatre miniatures pour trouver votre signature.',
                'description' => 'Quatre miniatures de 10 ml pour trouver sa signature : Noir, Ambre, Aurore et Soie. Idéal avant de choisir un grand flacon.',
                'intensity' => null,
                'longevity' => null,
                'sillage' => null,
                'season' => null,
                'occasion' => null,
                'variants' => [
                    ['sku' => 'LPH-DECOUVERTE-4X10', 'label' => '4 × 10 ml', 'size_ml' => 40, 'price_cents' => 39000, 'stock' => 14, 'is_default' => true],
                ],
                'notes' => ['top' => [], 'heart' => [], 'base' => []],
                'media' => [
                    ['url' => '/images/flacons/flacon-noir.webp', 'alt' => 'Coffret Découverte Luphéra, flacon Noir'],
                    ['url' => '/images/flacons/flacon-ambre.webp', 'alt' => 'Coffret Découverte Luphéra, flacon Ambre'],
                    ['url' => '/images/flacons/flacon-aurore.webp', 'alt' => 'Coffret Découverte Luphéra, flacon Aurore'],
                    ['url' => '/images/flacons/flacon-soie.webp', 'alt' => 'Coffret Découverte Luphéra, flacon Soie'],
                ],
                'bundle' => [
                    'name' => 'Coffret Découverte',
                    'items' => [
                        ['label' => 'Luphéra Noir, 10 ml'],
                        ['label' => 'Luphéra Ambre, 10 ml'],
                        ['label' => 'Luphéra Aurore, 10 ml'],
                        ['label' => 'Luphéra Soie, 10 ml'],
                    ],
                ],
            ],
        ];
    }
}
