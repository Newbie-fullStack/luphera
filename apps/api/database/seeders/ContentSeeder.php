<?php

namespace Database\Seeders;

use App\Domain\Content\Models\Page;
use Illuminate\Database\Seeder;

/**
 * Editorial pages.
 *
 * Every page is seeded as a draft with an explicit "[à compléter]" body: the
 * house story, the legal and delivery copy must be written and validated by
 * the house, never invented here. Publishing is a deliberate act in the
 * back-office.
 */
class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $placeholder = "[à compléter]\n\nCette page est un brouillon créé pour la démonstration. Le texte définitif doit être rédigé et validé avant publication.";

        $pages = [
            [
                'slug' => 'histoire',
                'title' => 'La maison',
                'meta_title' => 'La maison Luphéra',
                'meta_description' => 'Origines, gestes et matière première de la maison.',
                'position' => 1,
            ],
            [
                'slug' => 'livraison-et-retours',
                'title' => 'Livraison et retours',
                'meta_title' => 'Livraison et retours',
                'meta_description' => 'Délais, frais de livraison et politique de retour.',
                'position' => 2,
            ],
            [
                'slug' => 'mentions-legales',
                'title' => 'Mentions légales',
                'meta_title' => 'Mentions légales',
                'meta_description' => 'Éditeur, hébergement et données personnelles.',
                'position' => 3,
            ],
        ];

        foreach ($pages as $page) {
            Page::query()->updateOrCreate(
                ['slug' => $page['slug']],
                [
                    ...$page,
                    'body' => $placeholder,
                    'is_published' => false,
                ],
            );
        }
    }
}
