# Décisions techniques

Chaque ligne documente un choix et sa justification. Une décision qui change est datée et remplacée, jamais effacée silencieusement.

## Structure

| # | Décision | Justification |
| --- | --- | --- |
| 1 | Monorepo `apps/api` + `apps/web` | Un seul dépôt à cloner, une CI, un compose : le brief impose `docker compose up` depuis la racine. |
| 2 | API et front séparés, aucun Blade | Le brief exige une API seule ; le storefront pourra être remplacé ou doublé par une app mobile sans réécrire la logique. |
| 3 | Laravel 12.72 sur PHP 8.2 en local, PHP 8.3 en Docker et en CI | PHP 8.2 est le runtime disponible sur le poste ; 8.3 est la version de production et de l'image. |
| 4 | MySQL 8.4 en Docker/production, SQLite en local et pour les tests | SQLite rend les tests instantanés et sans service ; MySQL reste la cible réelle (JSON, index, transactions). |
| 5 | `spatie/laravel-permission` comme seule source des rôles | Une colonne `role` en doublon aurait divergé ; l'admin contourne les vérifications via `Gate::before`. |
| 6 | ULID en identifiant public, clé primaire entière en interne | URLs non énumérables côté public, jointures et index rapides côté base. |
| 7 | Enveloppe JSON unique `{ data, meta, errors }` | Un seul contrat pour tous les endpoints, erreurs de validation prévisibles côté front. |
| 8 | Montants en centimes entiers, devise MAD | Aucun flottant dans les calculs de panier, totaux identiques serveur et affichage. |

## Frontend

| # | Décision | Justification |
| --- | --- | --- |
| 9 | React 19 + TypeScript + Vite | Build rapide, typage strict, écosystème demandé par le brief. |
| 10 | Tailwind 4 avec tokens dans `@theme` | Les couleurs et polices de la charte deviennent des classes utilisables partout, sans fichier de config séparé. |
| 11 | Composants visuels complexes en CSS dans `components.css` | Les boutons à dégradé animé et les drawers demandent un contrôle que les utilitaires seuls rendent illisible. |
| 12 | `motion` (Framer Motion) comme seule bibliothèque d'animation | Une seule courbe, un seul modèle d'accessibilité (`useReducedMotion`) ; GSAP aurait doublé le poids et les conventions. |
| 13 | `three`, `@react-three/fiber`, `@react-three/drei` installés mais non utilisés en phase 0 | La scène 3D arrive en phase 6 ; l'installation maintenant évite un changement de lockfile tardif. |
| 14 | Polices Marcellus et Jost auto-hébergées (woff2) | Pas de requête vers Google Fonts, pas de CLS, pas de dépendance à un tiers pour la charte. |
| 15 | Images de flacons extraites de `reference/luphera.html` en WebP 305×1000 | Fidélité au design de référence et poids maîtrisé ; les visuels définitifs restent à fournir. |
| 16 | `Intl.NumberFormat('fr-FR')` pour `formatMAD` | Produit le groupement `1 980 MAD` du brief sans formatage manuel. |
| 17 | Découpage des routes par `lazy()` | Le design system (17,75 kB) ne pèse pas sur la page d'accueil ; le bundle initial reste sous 420 kB. |
| 18 | Tous les textes dans `fr.json` via i18next | Prépare l'arabe et le RTL de la phase 7 sans chasse aux chaînes dans les composants. |

## Qualité et exploitation

| # | Décision | Justification |
| --- | --- | --- |
| 19 | Pest 3.8 + PHPUnit 11 (et non Pest 4) | Pest 4 exige PHP 8.3 ; la CI et Docker sont en 8.3 mais le poste local en 8.2. |
| 20 | Pint et PHPStan niveau 6 bloquants en CI | Le style et les types sont vérifiés avant toute revue humaine. |
| 21 | ESLint `recommendedTypeChecked` + `tsc -b` bloquants | Les erreurs de type et les promesses non gérées échouent en CI, pas en production. |
| 22 | Vitest + Testing Library pour l'unitaire, Playwright pour le navigateur | Tests rapides sur les composants, parcours réel pour les captures et les flows critiques (phase 2). |
| 23 | Horizon pour les files, scheduler séparé | Les e-mails, exports et traitements lourds doivent être observables et relançables. |
| 24 | Meilisearch pour la recherche, Scout comme abstraction | Recherche tolérante aux fautes attendue au catalogue ; Scout permet de changer de moteur sans réécrire les modèles. |
| 25 | MinIO local, S3 en production | Même API de stockage partout, aucun fichier média dans Git. |
| 26 | Redis pour cache, sessions et queues | Une seule dépendance d'infrastructure, compatible Horizon. |
| 27 | Limiteurs de débit dédiés (`api`, `auth`, `orders`, `public-forms`, `ai`) | Les formulaires publics et l'IA n'ont pas le même coût ni le même risque que la lecture du catalogue. |
| 28 | En-têtes de sécurité posés par un middleware | HSTS, `nosniff`, `frame-ancestors` et `Referrer-Policy` sont garantis même si un proxy en oublie. |
| 29 | CI : API, web, `docker compose config`, messages de commit | Les trois surfaces qui peuvent casser un déploiement sont vérifiées à chaque push. |
| 30 | Pas de Sentry ni d'audit de dépendances en phase 0 | Réservés à la phase 7 (observabilité et durcissement) pour ne pas figer des clés absentes. |
| 31 | CI : installation explicite de `@rolldown/binding-linux-x64-gnu` | `npm ci`/`npm install` sautent parfois les bindings optionnels de Rolldown sur Linux (npm/cli#4828), ce qui empêche Vitest de démarrer. |

## Écarts assumés

| Écart | Raison | Suite |
| --- | --- | --- |
| `make up` non exécuté sur le poste de développement | Docker n'y est pas installé ; le compose est validé par `docker compose config` en CI. | À valider sur une machine Docker avant la phase 1. |
| Horizon non démarrable sous Windows | Extensions `pcntl` et `posix` absentes du PHP local. | Fonctionne dans l'image Docker. |
| Couverture web ~46 % | La phase 0 teste les fondations ; l'objectif de 80 % porte sur les domaines panier et commandes. | Phase 2. |
| Textes légaux, photos Femme, coordonnées | Non fournis par le client. | Marqués `[à compléter]`, jamais présentés comme définitifs. |
