<?php

namespace Database\Seeders;

use App\Domain\Content\Models\Page;
use Illuminate\Database\Seeder;

/**
 * Editorial pages.
 *
 * Both pages are seeded as drafts with an explicit "[à compléter]" body: the
 * legal and delivery copy must be written and validated by the house, never
 * invented here. Publishing is a deliberate act in the back-office.
 */
class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            [
                'slug' => 'livraison-et-retours',
                'title' => 'Livraison et retours',
                'meta_title' => 'Livraison et retours',
                'meta_description' => 'Délais, frais de livraison et politique de retour.',
                'position' => 1,
            ],
            [
                'slug' => 'mentions-legales',
                'title' => 'Mentions légales',
                'meta_title' => 'Mentions légales',
                'meta_description' => 'Éditeur, hébergement et données personnelles.',
                'position' => 2,
            ],
        ];

        foreach ($pages as $page) {
            Page::query()->updateOrCreate(
                ['slug' => $page['slug']],
                [
                    ...$page,
                    'body' => "[à compléter]\n\nCette page est un brouillon créé pour la démonstration. Le texte définitif doit être rédigé et validé avant publication.",
                    'is_published' => false,
                ],
            );
        }
    }
}
