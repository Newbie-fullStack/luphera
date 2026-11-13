# Luphéra

Maison marocaine d'eaux de parfum. Monorepo de la boutique : API Laravel 12, storefront React 19, MySQL 8.

> **État : phase 0 — fondations.** Le design system est complet, le catalogue et le parcours d'achat arrivent aux phases suivantes. Les prix, stocks et avis affichés sont des données de démonstration (`seed`) et ne doivent pas être présentés comme réels.

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Commandes](#commandes)
- [Comptes de test](#comptes-de-test)
- [Design system](#design-system)
- [Tests et qualité](#tests-et-qualité)
- [Documentation](#documentation)
- [Limites connues](#limites-connues)
- [Feuille de route](#feuille-de-route)

## Démarrage rapide

Prérequis : Docker Desktop (ou Docker Engine + Compose v2), `make`, ports 3306, 6379, 7700, 8000, 9000, 9001 et 5173 libres.

```bash
cp .env.example .env          # facultatif : les valeurs par défaut du compose suffisent
make up                       # construit et démarre MySQL, Redis, Meilisearch, MinIO, API, Horizon, scheduler, web
make seed                     # rôles, permissions et compte admin local
```

| Service | URL |
| --- | --- |
| Storefront | http://localhost:5173 |
| Design system | http://localhost:5173/design-system |
| API | http://localhost:8000/api/v1 |
| Meilisearch | http://localhost:7700 |
| MinIO (console) | http://localhost:9001 |

`make up` lance les migrations au démarrage du conteneur API. Le seed est lancé automatiquement (`SEED_ON_START=true`) ; `make seed` reste disponible pour le relancer.

### Sans Docker

Le projet tourne aussi en local avec PHP 8.2+ et Node 24, sur SQLite pour l'API :

```bash
# API
cd apps/api
composer install
cp .env.example .env
php artisan key:generate
# passer DB_CONNECTION à sqlite et créer database/database.sqlite
php artisan migrate --seed
php artisan serve --port=8000

# Storefront (autre terminal)
cd apps/web
npm install
npm run dev
```

Horizon et les workers nécessitent `pcntl`/`posix` : ils ne démarrent pas sur Windows, seulement sous Docker ou Linux.

## Architecture

```
apps/
  api/            Laravel 12 — API seule, aucune vue Blade
    app/          Http/Controllers/Api/V1, Models, Support, Services
    database/     migrations, seeders, factories
    routes/api.php
    tests/        Pest (Feature, Unit)
  web/            React 19 + TypeScript + Vite
    src/app/      routes et error boundary
    src/components/  layout, ui, three
    src/lib/      api client, formatage, téléphone
    src/pages/    pages publiques
    src/styles/   tokens Tailwind 4 et composants CSS
    src/i18n/     ressources françaises (arabe en phase 7)
docs/             DECISIONS.md, API.md, RUNBOOK.md, screens/
reference/        luphera.html, design de référence
docker-compose.yml
Makefile
```

Règles structurantes :

- Le front ne parle qu'à l'API (`/api/v1`), jamais à la base.
- Les montants circulent en centimes entiers (MAD), jamais en flottants.
- Les identifiants publics sont des ULID, les clés primaires restent des entiers.
- Les rôles vivent uniquement dans `spatie/laravel-permission`.
- Les textes visibles sont en français et centralisés dans `apps/web/src/i18n/locales/fr.json` ; le code, les tables, les routes et les commentaires sont en anglais.

## Commandes

| Commande | Effet |
| --- | --- |
| `make up` | Démarre toute la stack |
| `make down` | Arrête la stack en gardant les volumes |
| `make logs` | Suit les logs de tous les services |
| `make ps` | État des services |
| `make sh` | Shell dans le conteneur API |
| `make seed` | Seeders (rôles, permissions, admin local) |
| `make fresh` | `migrate:fresh --seed` |
| `make test` | Tests API + tests web |
| `make lint` | Pint, PHPStan, ESLint, TypeScript |
| `make build-web` | Build de production du storefront |
| `make screens` | Régénère `docs/screens/` (serveur de preview sur 4173) |

Côté web : `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:run`, `npm run test:smoke` (serveur de preview requis), `npm run format`.
Côté API : `php artisan test`, `vendor/bin/pint`, `vendor/bin/phpstan analyse`.

## Comptes de test

Créés uniquement en `local` et `testing` par `RolesAndPermissionsSeeder`.

| Rôle | Téléphone | Mot de passe |
| --- | --- | --- |
| Admin | `+212600000001` | `password` |

Le téléphone est l'identifiant de connexion. Les autres rôles (`manager`, `support`, `customer`) sont définis dans le seeder et n'ont pas de compte par défaut.

## Design system

`/design-system` est la charte vivante : couleurs (clic pour copier), typographie Marcellus + Jost, espacements, boutons, champs, tags, chips, stepper, sélecteur de contenance, jauge de livraison, courbes de mouvement, routes et règles de la scène 3D.

- Tokens dans `apps/web/src/styles/index.css` (`@theme` Tailwind 4).
- Composants CSS dans `apps/web/src/styles/components.css`.
- Polices auto-hébergées dans `apps/web/public/fonts/`.
- Courbe unique : `cubic-bezier(.22,.61,.12,1)` (`--ease-lux`), durées ≥ 400 ms.
- `prefers-reduced-motion` désactive animations et transitions.
- Captures : `docs/screens/home-1440.png`, `home-390.png`, `design-system-1440.png`, `design-system-390.png`.

## Tests et qualité

| Suite | Commande | État phase 0 |
| --- | --- | --- |
| API (Pest) | `cd apps/api && php artisan test` | 22 tests verts |
| API style | `vendor/bin/pint --test` | vert |
| API statique | `vendor/bin/phpstan analyse` | niveau 6, vert |
| Web (Vitest) | `cd apps/web && npm run test:run` | 28 tests verts |
| Web lint | `npm run lint` | vert |
| Web types | `npm run typecheck` | vert |
| Web build | `npm run build` | vert |
| Web smoke (routes, console, débordement) | `npm run test:smoke` | 10/10 vert |

La CI GitHub Actions (`.github/workflows/ci.yml`) rejoue ces étapes sur PHP 8.3 et Node 24, valide `docker compose config` et vérifie les préfixes de commit conventionnels sur les pull requests.

## Documentation

- [`docs/DECISIONS.md`](docs/DECISIONS.md) — chaque choix technique et sa justification.
- [`docs/API.md`](docs/API.md) — contrat OpenAPI des endpoints disponibles.
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — exploitation, incidents, sauvegardes.
- [`prompt-opencode-luphera.md`](prompt-opencode-luphera.md) — brief complet et plan par phases.

## Limites connues

- Docker n'est pas installé sur le poste de développement actuel : le compose est validé syntaxiquement (`docker compose config`, CI) mais `make up` n'a pas encore été exécuté de bout en bout. À vérifier en premier sur une machine Docker.
- PHP local est en 8.2 sans `intl`, `gd`, `pcntl`, `posix` : ces extensions ne sont présentes que dans l'image Docker.
- Horizon, les workers de queue et le scheduler ne tournent pas sous Windows.
- Meilisearch, MinIO et Redis ne sont pas nécessaires aux tests : SQLite, cache array et session array suffisent.
- Aucune passerelle de paiement, aucun envoi d'e-mail réel, aucun texte légal définitif : ces éléments sont marqués `[à compléter]`.

## Feuille de route

| Phase | Contenu | État |
| --- | --- | --- |
| 0 | Monorepo, Docker, CI, design system, décisions | en cours de validation |
| 1 | Catalogue, seeders, API produits, boutique, fiche, recherche | à venir |
| 2 | Panier serveur, coupons, livraison, commande idempotente, stock | à venir |
| 3 | Compte client, adresses, historique | à venir |
| 4 | Administration (produits, commandes, stocks, coupons) | à venir |
| 5 | Contenus, pages maison, livraison, contact | à venir |
| 6 | Scène 3D et animations avancées | à venir |
| 7 | Arabe, RTL, SEO, observabilité, durcissement | à venir |

## Points à fournir par le client

Photos du flacon Femme, textes légaux (mentions, CGV, confidentialité), liste INCI, coordonnées réelles (WhatsApp, e-mail, adresse), clés API (paiement, e-mail, IA), choix du transporteur et du moyen de paiement en ligne.
