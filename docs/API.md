# Contrat API — v1

Base locale : `http://localhost:8000/api/v1`. Toutes les réponses sont en JSON, `Accept: application/json` et `X-Requested-With: XMLHttpRequest` recommandés.

Ce document décrit les endpoints **disponibles en phase 0**. Le contrat complet (catalogue, panier, commandes, compte, admin) est ajouté au fil des phases ; la spécification OpenAPI ci-dessous en est la source de vérité.

## Enveloppe

Succès :

```json
{
  "data": {},
  "meta": {},
  "errors": []
}
```

Erreur :

```json
{
  "data": null,
  "meta": {},
  "errors": {
    "code": "validation_error",
    "message": "Les données envoyées sont invalides.",
    "fields": {
      "phone": ["Le numéro est invalide."]
    }
  }
}
```

Règles :

- `data` vaut `null` en erreur, `meta` est toujours un objet (même vide), `errors` est un tableau vide en succès.
- Les montants sont des entiers en centimes de dirham (MAD). Aucun flottant.
- Les dates sont en ISO 8601 UTC (`2026-11-13T18:42:00+00:00`).
- Les identifiants publics sont des ULID de 26 caractères.
- Les erreurs métier portent un `code` stable (`validation_error`, `not_found`, `out_of_stock`, `invalid_coupon`, `rate_limited`, `server_error`).
- Les réponses d'erreur Laravel sont normalisées en JSON par `bootstrap/app.php`, y compris les 404 et 500.

## Limites de débit

| Limiteur | Usage | Limite |
| --- | --- | --- |
| `api` | Lecture publique | 120 requêtes / minute / IP |
| `auth` | Connexion, inscription | 10 requêtes / minute / IP |
| `orders` | Création de commande | 20 requêtes / minute / IP |
| `public-forms` | Contact, newsletter | 5 requêtes / minute / IP |
| `ai` | Assistant (phase 6) | 10 requêtes / minute / utilisateur |

Dépassement : `429` avec `Retry-After` et `errors.code = "rate_limited"`.

## Sécurité

- CORS restreint à `FRONTEND_URL` et `ADMIN_URL`, credentials autorisés.
- En-têtes posés sur toutes les réponses : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS hors local.
- Sanctum par cookie pour le storefront, tokens Bearer pour les clients non navigateur.
- Toute route d'administration exige un rôle vérifié par `spatie/laravel-permission`.

## Endpoints phase 0

### `GET /api/v1`

Métadonnées de l'API.

```json
{
  "data": {
    "name": "Luphéra API",
    "version": "v1",
    "documentation": "docs/API.md"
  },
  "meta": {},
  "errors": []
}
```

### `GET /api/v1/health`

Sonde de disponibilité pour le load balancer et la supervision. Ne révèle aucun secret.

```json
{
  "data": {
    "status": "ok",
    "service": "luphera-api",
    "version": "v1",
    "checks": {
      "database": true,
      "cache": true
    }
  },
  "meta": {},
  "errors": []
}
```

`200` si toutes les sondes passent, `503` avec `status: "degraded"` sinon.

### `GET /api/v1/settings/public`

Réglages publics consommés par le storefront : identité, devise, frais de livraison.

```json
{
  "data": {
    "brand": {
      "name": "Luphéra",
      "tagline": "Avancer sans bruit, laisser une trace d'or.",
      "whatsapp": "[à compléter]",
      "email": "[à compléter]"
    },
    "currency": {
      "code": "MAD",
      "symbol": "MAD",
      "tax_included": true
    },
    "shipping": {
      "flat_fee_cents": 3500,
      "free_threshold_cents": 80000,
      "default_delay": "24 à 72 h"
    },
    "seed": true
  },
  "meta": {},
  "errors": []
}
```

`seed: true` signale que les valeurs ne sont pas encore administrées en base. `whatsapp` et `email` restent `[à compléter]` tant que le client ne les a pas fournis.

## Spécification OpenAPI

```yaml
openapi: 3.1.0
info:
  title: Luphéra API
  version: 1.0.0
  description: |
    API de la maison Luphéra. Montants en centimes entiers (MAD), identifiants
    publics en ULID, enveloppe unique data/meta/errors.
servers:
  - url: http://localhost:8000/api/v1
    description: Local (Docker)
  - url: https://api.luphera.ma/api/v1
    description: Production (à confirmer)
tags:
  - name: System
    description: Métadonnées, santé, réglages publics
paths:
  /:
    get:
      tags: [System]
      summary: Métadonnées de l'API
      operationId: getApiRoot
      responses:
        '200':
          description: Version et point d'entrée de la documentation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiRootEnvelope'
  /health:
    get:
      tags: [System]
      summary: Sonde de disponibilité
      operationId: getHealth
      responses:
        '200':
          description: Toutes les sondes passent
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthEnvelope'
        '503':
          description: Au moins une dépendance est indisponible
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthEnvelope'
  /settings/public:
    get:
      tags: [System]
      summary: Réglages publics du storefront
      operationId: getPublicSettings
      responses:
        '200':
          description: Identité, devise et livraison
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PublicSettingsEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
components:
  responses:
    TooManyRequests:
      description: Limite de débit atteinte
      headers:
        Retry-After:
          schema:
            type: integer
          description: Secondes avant nouvelle tentative
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
  schemas:
    Meta:
      type: object
      additionalProperties: true
    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
          examples: [validation_error, not_found, rate_limited, server_error]
        message:
          type: string
        fields:
          type: object
          additionalProperties:
            type: array
            items:
              type: string
    ApiRootEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: object
          required: [name, version, documentation]
          properties:
            name:
              type: string
              examples: [Luphéra API]
            version:
              type: string
              examples: [v1]
            documentation:
              type: string
              examples: [docs/API.md]
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    HealthEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: object
          required: [status, service, version, checks]
          properties:
            status:
              type: string
              enum: [ok, degraded]
            service:
              type: string
              examples: [luphera-api]
            version:
              type: string
              examples: [v1]
            checks:
              type: object
              required: [database, cache]
              properties:
                database:
                  type: boolean
                cache:
                  type: boolean
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    PublicSettingsEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: object
          required: [brand, currency, shipping, seed]
          properties:
            brand:
              type: object
              required: [name, tagline, whatsapp, email]
              properties:
                name:
                  type: string
                tagline:
                  type: string
                whatsapp:
                  type: string
                  description: '[à compléter] tant que le client ne l’a pas fourni'
                email:
                  type: string
                  description: '[à compléter] tant que le client ne l’a pas fourni'
            currency:
              type: object
              required: [code, symbol, tax_included]
              properties:
                code:
                  type: string
                  const: MAD
                symbol:
                  type: string
                  const: MAD
                tax_included:
                  type: boolean
            shipping:
              type: object
              required: [flat_fee_cents, free_threshold_cents, default_delay]
              properties:
                flat_fee_cents:
                  type: integer
                  minimum: 0
                  examples: [3500]
                free_threshold_cents:
                  type: integer
                  minimum: 0
                  examples: [80000]
                default_delay:
                  type: string
                  examples: [24 à 72 h]
            seed:
              type: boolean
              description: Vrai tant que les réglages viennent de la configuration
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    ErrorEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: 'null'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          $ref: '#/components/schemas/Error'
```

## À venir

| Phase | Endpoints |
| --- | --- |
| 1 | `GET /products`, `GET /products/{slug}`, `GET /collections`, `GET /search` |
| 2 | `GET/POST/PATCH/DELETE /cart`, `POST /cart/coupon`, `GET /shipping/cities`, `POST /orders`, `GET /orders/{number}` |
| 3 | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `GET/POST /me/addresses`, `GET /me/orders` |
| 4 | `/admin/products`, `/admin/orders`, `/admin/stock`, `/admin/coupons` |
| 6 | `POST /ai/chat` (budget de tokens plafonné) |

Chaque ajout met à jour ce fichier et la spécification OpenAPI dans le même commit.
