# Luphéra

[![CI](https://github.com/Newbie-fullStack/luphera/actions/workflows/ci.yml/badge.svg)](https://github.com/Newbie-fullStack/luphera/actions/workflows/ci.yml)

Maison marocaine d'eaux de parfum. Monorepo de la boutique : API Laravel 12, storefront React 19, console de gestion React 19, MySQL 8.

> **État : phase 4 — back-office.** Le catalogue, le panier serveur, les coupons, la livraison par ville, la commande sans compte, le compte client (session, profil, adresses, favoris, historique et facture), puis la console de gestion (commandes, catalogue, stock, clients, coupons, paramètres, pages, journal d'audit) sont livrés. Les prix, stocks, frais de livraison, le code `LUPHERA10` et les comptes de démonstration sont des données de `seed` et ne doivent pas être présentés comme réels.

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

Prérequis : Docker Desktop (ou Docker Engine + Compose v2), `make`, ports 3306, 6379, 7700, 8000, 9000, 9001, 5173 et 5174 libres.

```bash
cp .env.example .env          # facultatif : les valeurs par défaut du compose suffisent
make up                       # construit et démarre MySQL, Redis, Meilisearch, MinIO, API, Horizon, scheduler, web
make seed                     # rôles, permissions, compte admin local et catalogue de démonstration
```

| Service | URL |
| --- | --- |
| Storefront | http://localhost:5173 |
| Boutique | http://localhost:5173/boutique |
| Fiche produit | http://localhost:5173/produit/luphera-noir |
| Commande | http://localhost:5173/commande |
| Suivi de commande | http://localhost:5173/suivi |
| Connexion | http://localhost:5173/connexion |
| Compte client | http://localhost:5173/compte |
| Design system | http://localhost:5173/design-system |
| Console de gestion | http://localhost:5174 |
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

# Console de gestion (troisième terminal)
cd apps/admin
npm install
npm run dev          # http://localhost:5174
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
    src/features/ catalogue : types, API, hooks, cartes, filtres
    src/features/auth/   session : contexte, schémas Zod, formulaires
    src/features/account/ profil, commandes, adresses, favoris, garde de route
    src/features/cart/   panier : contexte, API, tiroir
    src/features/orders/ commande : schéma, suivi, stockage du jeton
    src/lib/      api client (CSRF), formatage, téléphone, debounce
    src/pages/    pages publiques et formulaires d'authentification
    src/styles/   tokens Tailwind 4 et composants CSS
    src/i18n/     ressources françaises (arabe en phase 7)
  admin/          React 19 + TypeScript + Vite — console de gestion (5174)
    src/app/      routes protégées par permission
    src/components/  shell (navigation, en-tête) et composants de table
    src/features/auth/ session staff, gardes, écran de connexion
    src/lib/api/  client typé des endpoints `/admin`
    src/pages/    tableau de bord, commandes, catalogue, stock, clients, coupons, pages, paramètres, journal
    src/i18n/     ressources françaises de la console
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
- L'authentification passe par une session Sanctum (`httpOnly`) : le navigateur n'obtient aucun token, et les mutations renvoient le cookie `XSRF-TOKEN` en `X-XSRF-TOKEN`.
- Le back-office réutilise cette session mais exige un rôle `admin`, `manager` ou `support` ; un client connecté reçoit `403`, jamais les données.
- Chaque mutation du back-office écrit une ligne append-only dans `audit_logs` : action, auteur, IP et écart avant/après.

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
| `make screens` | Régénère `docs/screens/` (serveur de preview sur 4173 ; `SCREEN_FLOW=account` pour les seuls écrans de compte) |

Côté web : `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:run`, `npm run test:smoke` (serveur de preview requis), `npm run format`.
Côté admin : `npm run dev` (port 5174), `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:run`.
Côté API : `php artisan test`, `vendor/bin/pint`, `vendor/bin/phpstan analyse`.

Vérifications de bout en bout, serveurs API et front démarrés sur une base fraîchement seedée :

```bash
cd apps/api && php artisan migrate:fresh --seed
cd apps/web && node scripts/journey.mjs        # parcours d'achat, 360 et 1440
cd apps/web && node scripts/audit-admin.mjs    # console : droits, confirmation, expédition, 12 routes
cd apps/web && node scripts/check-openapi.mjs  # cohérence des $ref de docs/API.md
```

`scripts/journey.mjs` rejoue visiteur → fiche → panier → coupon → commande → confirmation → suivi. `scripts/audit-admin.mjs` crée une commande réelle par l'API publique, vérifie qu'un `support` ne peut pas toucher au catalogue, qu'il peut confirmer, qu'un `manager` prépare puis expédie avec suivi, puis parcourt les douze écrans à 1440 et 390 px. Les deux scripts vérifient l'absence de débordement horizontal et d'erreur console.

## Comptes de test

Créés uniquement en `local` et `testing` par `RolesAndPermissionsSeeder` (staff) et `DemoCustomerSeeder` (client).

| Rôle | Téléphone | E-mail | Mot de passe | Accès |
| --- | --- | --- | --- | --- |
| Admin | `+212600000001` | `admin@luphera.test` | `password` | console : tout |
| Manager | `+212600000002` | `manager@luphera.test` | `password` | console : catalogue, commandes, clients, coupons, pages |
| Support | `+212600000003` | `support@luphera.test` | `password` | console : lecture catalogue, confirmation de commande |
| Client | `+212600000010` | `client@luphera.test` | `password` | boutique : compte de démonstration avec une commande livrée |

Le téléphone ou l'e-mail sert d'identifiant. Ces comptes n'existent jamais en production ; un compte client réel se crée depuis `/inscription`.

## Design system

`/design-system` est la charte vivante : couleurs (clic pour copier), typographie Marcellus + Jost, espacements, boutons, champs, tags, chips, stepper, sélecteur de contenance, jauge de livraison, courbes de mouvement, routes et règles de la scène 3D.

- Tokens dans `apps/web/src/styles/index.css` (`@theme` Tailwind 4).
- Composants CSS dans `apps/web/src/styles/components.css`.
- Polices auto-hébergées dans `apps/web/public/fonts/`.
- Courbe unique : `cubic-bezier(.22,.61,.12,1)` (`--ease-lux`), durées ≥ 400 ms.
- `prefers-reduced-motion` désactive animations et transitions.
- Captures : `docs/screens/home-1440.png`, `home-390.png`, `shop-1440.png`, `shop-390.png`, `product-1440.png`, `product-390.png`, `cart-1440.png`, `cart-390.png`, `checkout-1440.png`, `checkout-390.png`, `confirmation-1440.png`, `confirmation-390.png`, `tracking-1440.png`, `tracking-390.png`, `account-login-1440.png`, `account-login-390.png`, `account-profile-1440.png`, `account-profile-390.png`, `account-orders-1440.png`, `account-orders-390.png`, `account-addresses-1440.png`, `account-addresses-390.png`, `account-wishlist-1440.png`, `account-wishlist-390.png`, `design-system-1440.png`, `design-system-390.png`.

### Console de gestion

La console reprend les mêmes tokens (`apps/admin/src/styles/index.css`) et les mêmes composants CSS, avec une densité de table adaptée au travail quotidien : `panel`, `table`, `badge`, `btn`, `field-*`. Elle ne charge ni la scène 3D ni les polices de la boutique au-delà de Marcellus et Jost.

- Routes : `/connexion`, `/` (tableau de bord), `/commandes`, `/commandes/:number`, `/produits`, `/produits/nouveau`, `/produits/:id`, `/stock`, `/clients`, `/clients/:id`, `/coupons`, `/pages`, `/parametres`, `/journal`.
- Les actions sont masquées à partir du tableau `permissions` renvoyé par `GET /admin/me`, jamais à partir du nom du rôle.
- Captures : `docs/screens/admin-login-1440.png`, `admin-login-390.png`, `admin-dashboard-1440.png`, `admin-dashboard-390.png`, `admin-orders-1440.png`, `admin-orders-390.png`, `admin-order-detail-1440.png`, `admin-order-detail-390.png`, `admin-stock-1440.png`, `admin-stock-390.png`, `admin-products-1440.png`, `admin-product-editor-1440.png`, `admin-customers-1440.png`, `admin-customer-detail-1440.png`, `admin-coupons-1440.png`, `admin-pages-1440.png`, `admin-settings-1440.png`, `admin-audit-1440.png`.
- Régénération : `cd apps/web && SCREEN_FLOW=admin node scripts/screens.mjs` (API sur 8000, console sur 5174, base seedée).

## Tests et qualité

| Suite | Commande | État phase 4 |
| --- | --- | --- |
| API (Pest) | `cd apps/api && php artisan test` | 143 tests verts (661 assertions) |
| API style | `vendor/bin/pint --test` | vert |
| API statique | `vendor/bin/phpstan analyse` | niveau 6, vert |
| Web (Vitest) | `cd apps/web && npm run test:run` | 97 tests verts (20 fichiers) |
| Web lint | `npm run lint` | vert |
| Web types | `npm run typecheck` | vert |
| Web build | `npm run build` | vert |
| Web smoke (routes, console, débordement) | `npm run test:smoke` | 22/22 vert |
| Parcours d'achat | `node scripts/journey.mjs` | 20/20 vert (360 et 1440) |
| Console (Vitest) | `cd apps/admin && npm run test:run` | 8 tests verts (2 fichiers) |
| Console lint / types / build | `npm run lint`, `npm run typecheck`, `npm run build` | vert |
| Audit back-office (droits, commande, 12 routes) | `node scripts/audit-admin.mjs` | 31/31 vert (1440 et 390) |
| Contrat OpenAPI | `node scripts/check-openapi.mjs` | 53 chemins, 81 schémas, références valides |

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
- Le changement de téléphone n'est pas encore possible depuis le compte : il exige une vérification par SMS, marquée `[à compléter]`.
- Les commandes invité ne rejoignent un compte qu'à l'inscription, si le téléphone normalisé correspond ; une connexion ne réclame jamais de commande.
- La facture PDF n'est disponible que pour une commande `delivered` ; ses mentions légales restent `[à compléter]`.
- Le parcours d'achat consomme du stock : relancer `php artisan migrate:fresh --seed` avant de rejouer `scripts/journey.mjs` ou `scripts/screens.mjs`.
- Les frais de livraison par ville et le coupon `LUPHERA10` viennent de `CommerceSeeder` : ce sont des valeurs provisoires, à remplacer par le contrat transporteur et les conditions réelles.
- Les pages éditoriales sont éditables dans la console mais la boutique lit encore ses écrans d'attente pour `/livraison` et `/mentions-legales` ; le branchement arrive avec les contenus définitifs. Les deux pages seedées sont des brouillons `[à compléter]`.
- Les messages de contact et les avis clients n'ont pas encore de table ni d'écran, alors que les permissions `messages.view` et `reviews.moderate` existent déjà.
- La console n'a pas de service Docker dédié : elle tourne en `npm run dev` sur 5174. Le service sera ajouté avec la phase de déploiement, faute de Docker sur le poste actuel.
- Le bundle de la console fait 623 kB (182 kB gzip) sans découpage : l'éditeur produit concentre l'essentiel.

## Feuille de route

| Phase | Contenu | État |
| --- | --- | --- |
| 0 | Monorepo, Docker, CI, design system, décisions | livrée |
| 1 | Catalogue, seeders, API produits, boutique, fiche, recherche | livrée (catalogue de démonstration) |
| 2 | Panier serveur, coupons, livraison, commande idempotente, stock | livrée (frais et coupon de démonstration) |
| 3 | Compte client (session Sanctum), adresses, favoris, historique, facture | livrée |
| 4 | Administration : commandes, catalogue, stock, clients, coupons, paramètres, pages, audit | livrée (rôles et comptes de démonstration) |
| 5 | Contenus, pages maison, livraison, contact | à venir |
| 6 | Scène 3D et animations avancées | à venir |
| 7 | Arabe, RTL, SEO, observabilité, durcissement | à venir |

## Points à fournir par le client

Photos du flacon Femme, textes légaux (mentions, CGV, confidentialité), liste INCI, coordonnées réelles (WhatsApp, e-mail, adresse), clés API (paiement, e-mail, IA), choix du transporteur et du moyen de paiement en ligne.
