# Phase 0 — checklist de sortie

Critère du brief : `make up` démarre tout, la CI est verte, `/design-system` affiche les composants.

## Livrables

| Élément | Fichier | État |
| --- | --- | --- |
| Monorepo API + web | `apps/api`, `apps/web` | fait |
| Docker Compose (MySQL, Redis, Meilisearch, MinIO, API, Horizon, scheduler, web) | `docker-compose.yml` | écrit, validé par `docker compose config` en CI |
| Image API | `apps/api/Dockerfile`, `apps/api/docker/entrypoint.sh` | fait |
| Makefile | `Makefile` | fait |
| CI | `.github/workflows/ci.yml` | fait |
| Design system en composants | `apps/web/src/pages/DesignSystemPage.tsx`, `/design-system` | fait |
| Décisions | `docs/DECISIONS.md` | fait |
| Contrat API | `docs/API.md` | fait |
| Runbook | `docs/RUNBOOK.md` | fait |
| Captures desktop et mobile | `docs/screens/*.png` | fait |

## Vérifications locales

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Tests API | `cd apps/api && php artisan test` | 22 verts |
| Style API | `vendor/bin/pint --test` | vert |
| Analyse statique API | `vendor/bin/phpstan analyse` | niveau 6, vert |
| Lint web | `cd apps/web && npm run lint` | vert |
| Types web | `npm run typecheck` | vert |
| Tests web | `npm run test:run` | 28 verts |
| Build web | `npm run build` | vert, chunks séparés |
| Rendu desktop 1440 | capture Playwright | conforme à la référence |
| Rendu mobile 390 | capture Playwright | conforme à la référence |
| Mouvement réduit | captures avec `reducedMotion: 'reduce'` | contenu visible, sans animation |
| Smoke routes desktop et mobile | `npm run test:smoke` | 10/10, aucune erreur console, aucun débordement |

## Non vérifié localement

| Point | Raison | À faire |
| --- | --- | --- |
| `make up` de bout en bout | Docker absent du poste | exécuter sur une machine Docker avant la phase 1 |
| Horizon | `pcntl`/`posix` absents du PHP local | vérifier dans le conteneur |
| Meilisearch et MinIO réels | services non démarrés en local | vérifier au premier `make up` |
| MySQL 8.4 | tests sur SQLite | vérifier migrations et collation au premier `make up` |

## Reste à fournir par le client

Photos du flacon Femme, textes légaux, liste INCI, coordonnées (WhatsApp, e-mail, adresse), clés API, transporteur et moyen de paiement.
