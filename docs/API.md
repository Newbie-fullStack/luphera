# Contrat API — v1

Base locale : `http://localhost:8000/api/v1`. Toutes les réponses sont en JSON, `Accept: application/json` et `X-Requested-With: XMLHttpRequest` recommandés.

Ce document décrit les endpoints **disponibles en phase 0 et en phase 1**. Le contrat complet (panier, commandes, compte, admin) est ajouté au fil des phases ; la spécification OpenAPI ci-dessous en est la source de vérité.

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

## Endpoints phase 1 — catalogue

Le catalogue semé (`CatalogSeeder`) contient six produits de démonstration : quatre eaux de parfum (Noir, Ambre, Aurore, Soie) et deux coffrets. Chaque produit est marqué `is_demo: true` ; le storefront affiche un avertissement discret.

### `GET /api/v1/products`

Liste paginée par curseur, filtrable et triable. Tous les filtres sont optionnels et combinables.

| Paramètre | Type | Règles |
| --- | --- | --- |
| `line` | enum | `homme`, `femme`, `coffret` |
| `family` | string | 64 caractères max, correspondance exacte |
| `notes[]` | string[] | 6 notes max ; un produit doit contenir **toutes** les notes demandées |
| `min_price` | integer | Centimes, ≥ 0 |
| `max_price` | integer | Centimes, ≥ `min_price` si fourni |
| `q` | string | 2 à 80 caractères ; cherche dans le nom, la famille, le tag, les descriptions et les notes |
| `sort` | enum | `pertinence` (défaut), `prix-asc`, `prix-desc`, `nouveau` |
| `per_page` | integer | 1 à 24, défaut 12 |
| `cursor` | string | Curseur opaque renvoyé par `meta.next_cursor` |

Tri déterministe : `position,id` pour `pertinence`, `from_price_cents,id` pour les prix, `created_at,id` pour `nouveau`.

```json
{
  "data": [
    {
      "id": "01M7CEEFAVYY6ZH8JX8W2DMMTE",
      "slug": "luphera-noir",
      "name": "Luphéra Noir",
      "line": "homme",
      "family": "Boisé cuiré",
      "tag": "Best-seller",
      "short_description": "Cuir noir, iris, cèdre.",
      "from_price_cents": 45000,
      "variants_count": 3,
      "is_demo": true,
      "image": {
        "url": "/images/flacons/flacon-noir.webp",
        "alt": "Flacon Luphéra Noir, verre noir et or"
      }
    }
  ],
  "meta": {
    "next_cursor": "eyJwb3NpdGlvbiI6MiwiaWQiOjIsIl9wb2ludHNUb05leHRJdGVtcyI6dHJ1ZX0",
    "prev_cursor": null,
    "per_page": 12,
    "total": 6,
    "facets": {
      "lines": ["homme", "femme", "coffret"],
      "families": ["4 × 10 ml", "Ambré épicé", "Boisé cuiré", "Floral vanillé", "Noir + Aurore", "Poudré musqué"],
      "notes": ["Ambre", "Ambre gris", "Bergamote", "Cuir noir", "Iris", "Rose de Damas"],
      "price": { "min_cents": 39000, "max_cents": 119000 }
    }
  },
  "errors": []
}
```

`meta.facets` décrit tout le catalogue actif, indépendamment des filtres courants, pour que le front puisse construire ses listes sans appel supplémentaire. `meta.total` est le nombre de résultats filtrés.

Filtre inconnu ou valeur invalide : `422` avec `errors.code = "validation_error"` et `errors.fields` détaillant chaque paramètre.

### `GET /api/v1/products/{slug}`

Fiche complète. `404` (`errors.code = "not_found"`) si le slug n'existe pas ou si le produit n'est pas actif.

```json
{
  "data": {
    "id": "01M7CEEFAVYY6ZH8JX8W2DMMTE",
    "slug": "luphera-noir",
    "name": "Luphéra Noir",
    "line": "homme",
    "family": "Boisé cuiré",
    "tag": "Best-seller",
    "short_description": "Cuir noir, iris, cèdre.",
    "from_price_cents": 45000,
    "variants_count": 3,
    "is_demo": true,
    "image": { "url": "/images/flacons/flacon-noir.webp", "alt": "Flacon Luphéra Noir, verre noir et or" },
    "description": "Un boisé cuiré sombre et profond…",
    "intensity": 4,
    "longevity": 5,
    "sillage": 4,
    "season": "Automne, hiver",
    "occasion": "Soirée, bureau",
    "seo": { "title": "Luphéra Noir — eau de parfum | Luphéra", "description": "Cuir noir, iris, cèdre." },
    "variants": [
      {
        "id": "01M7CEEFAVYY6ZH8JX8W2DMMTF",
        "sku": "LPH-NOIR-30",
        "label": "30 ml",
        "size_ml": 30,
        "price_cents": 45000,
        "compare_at_price_cents": null,
        "stock_status": "in_stock",
        "is_default": false
      }
    ],
    "notes": {
      "top": ["Bergamote", "Poivre noir", "Cardamome"],
      "heart": ["Cuir noir", "Iris", "Cèdre"],
      "base": ["Ambre gris", "Patchouli", "Mousse de chêne"]
    },
    "media": [
      { "type": "photo", "url": "/images/flacons/flacon-noir.webp", "alt": "Flacon Luphéra Noir, verre noir et or" }
    ],
    "bundle": null
  },
  "meta": {},
  "errors": []
}
```

`variants[].stock_status` vaut `in_stock`, `low_stock` ou `out_of_stock`. Le stock exact n'est **jamais** exposé. `bundle` décrit la composition éditoriale d'un coffret (`items[].label`, `quantity`, `variant.product.slug`) et vaut `null` pour un flacon seul.

### `GET /api/v1/products/{slug}/related`

Trois produits actifs, sans le produit courant, classés par proximité de ligne puis par position. Réponse : tableau de fiches résumées (même forme que `GET /products`) et `meta.total`.

### `GET /api/v1/bundles`

Liste les coffrets avec leur composition et le produit porteur.

```json
{
  "data": [
    {
      "id": "01M7CEEFAVYY6ZH8JX8W2DMMTG",
      "name": "Coffret Duo",
      "product": {
        "id": "01M7CEEFAVYY6ZH8JX8W2DMMTH",
        "slug": "coffret-duo",
        "name": "Coffret Duo",
        "line": "coffret",
        "family": "Noir + Aurore",
        "tag": "Édition limitée",
        "short_description": "Noir et Aurore, réunis dans un écrin noir et or.",
        "from_price_cents": 119000,
        "variants_count": 1,
        "is_demo": true,
        "image": { "url": "/images/flacons/flacon-noir.webp", "alt": "Coffret Duo Luphéra, flacon Noir" }
      },
      "items": [
        {
          "label": "Luphéra Noir, 50 ml",
          "quantity": 1,
          "variant": {
            "id": "01M7CEEFAVYY6ZH8JX8W2DMMTJ",
            "size_ml": 50,
            "product": { "slug": "luphera-noir", "name": "Luphéra Noir" }
          }
        }
      ]
    }
  ],
  "meta": { "total": 2 },
  "errors": []
}
```

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
  - name: Catalog
    description: Produits, variantes, notes et coffrets
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
  /products:
    get:
      tags: [Catalog]
      summary: Liste paginée du catalogue
      operationId: listProducts
      parameters:
        - name: line
          in: query
          schema:
            type: string
            enum: [homme, femme, coffret]
        - name: family
          in: query
          schema:
            type: string
            maxLength: 64
        - name: notes[]
          in: query
          description: Notes obligatoires, répétées (6 maximum)
          schema:
            type: array
            maxItems: 6
            items:
              type: string
              maxLength: 80
          style: form
          explode: true
        - name: min_price
          in: query
          schema:
            type: integer
            minimum: 0
        - name: max_price
          in: query
          schema:
            type: integer
            minimum: 0
        - name: q
          in: query
          schema:
            type: string
            minLength: 2
            maxLength: 80
        - name: sort
          in: query
          schema:
            type: string
            enum: [pertinence, prix-asc, prix-desc, nouveau]
            default: pertinence
        - name: per_page
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 24
            default: 12
        - name: cursor
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Produits filtrés et facettes du catalogue
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListEnvelope'
        '422':
          description: Filtre invalide
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /products/{slug}:
    get:
      tags: [Catalog]
      summary: Fiche produit complète
      operationId: getProduct
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Produit, variantes, notes, médias et coffret
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductEnvelope'
        '404':
          description: Produit introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /products/{slug}/related:
    get:
      tags: [Catalog]
      summary: Trois produits proches
      operationId: getRelatedProducts
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Produits liés, sans le produit courant
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListEnvelope'
        '404':
          description: Produit introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /bundles:
    get:
      tags: [Catalog]
      summary: Coffrets et leur composition
      operationId: listBundles
      responses:
        '200':
          description: Coffrets actifs
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BundleListEnvelope'
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
    ProductImage:
      type: object
      required: [url, alt]
      properties:
        url:
          type: string
        alt:
          type: string
    ProductSummary:
      type: object
      required: [id, slug, name, line, family, short_description, from_price_cents, is_demo, image]
      properties:
        id:
          type: string
          description: ULID public
        slug:
          type: string
        name:
          type: string
        line:
          type: string
          enum: [homme, femme, coffret]
        family:
          type: string
        tag:
          type: [string, 'null']
        short_description:
          type: string
        from_price_cents:
          type: integer
          minimum: 0
        variants_count:
          type: [integer, 'null']
        is_demo:
          type: boolean
        image:
          oneOf:
            - $ref: '#/components/schemas/ProductImage'
            - type: 'null'
    ProductVariant:
      type: object
      required: [id, sku, label, size_ml, price_cents, stock_status, is_default]
      properties:
        id:
          type: string
        sku:
          type: string
        label:
          type: string
        size_ml:
          type: integer
        price_cents:
          type: integer
          minimum: 0
        compare_at_price_cents:
          type: [integer, 'null']
        stock_status:
          type: string
          enum: [in_stock, low_stock, out_of_stock]
        is_default:
          type: boolean
    ProductNotes:
      type: object
      required: [top, heart, base]
      properties:
        top:
          type: array
          items:
            type: string
        heart:
          type: array
          items:
            type: string
        base:
          type: array
          items:
            type: string
    ProductMedia:
      type: object
      required: [type, url, alt]
      properties:
        type:
          type: string
          enum: [photo, model3d]
        url:
          type: string
        alt:
          type: string
    BundleItem:
      type: object
      required: [label, quantity]
      properties:
        label:
          type: string
        quantity:
          type: integer
          minimum: 1
        variant:
          oneOf:
            - type: object
              required: [id, size_ml, product]
              properties:
                id:
                  type: string
                size_ml:
                  type: integer
                product:
                  type: object
                  required: [slug, name]
                  properties:
                    slug:
                      type: string
                    name:
                      type: string
            - type: 'null'
    Bundle:
      type: object
      required: [id, name, product, items]
      properties:
        id:
          type: string
        name:
          type: string
        product:
          $ref: '#/components/schemas/ProductSummary'
        items:
          type: array
          items:
            $ref: '#/components/schemas/BundleItem'
    ProductDetail:
      allOf:
        - $ref: '#/components/schemas/ProductSummary'
        - type: object
          required: [description, variants, notes, media, bundle]
          properties:
            description:
              type: string
            intensity:
              type: [integer, 'null']
              minimum: 0
              maximum: 5
            longevity:
              type: [integer, 'null']
              minimum: 0
              maximum: 5
            sillage:
              type: [integer, 'null']
              minimum: 0
              maximum: 5
            season:
              type: [string, 'null']
            occasion:
              type: [string, 'null']
            seo:
              type: object
              properties:
                title:
                  type: [string, 'null']
                description:
                  type: [string, 'null']
            variants:
              type: array
              items:
                $ref: '#/components/schemas/ProductVariant'
            notes:
              $ref: '#/components/schemas/ProductNotes'
            media:
              type: array
              items:
                $ref: '#/components/schemas/ProductMedia'
            bundle:
              oneOf:
                - $ref: '#/components/schemas/Bundle'
                - type: 'null'
    CatalogFacets:
      type: object
      required: [lines, families, notes, price]
      properties:
        lines:
          type: array
          items:
            type: string
        families:
          type: array
          items:
            type: string
        notes:
          type: array
          items:
            type: string
        price:
          type: object
          required: [min_cents, max_cents]
          properties:
            min_cents:
              type: integer
            max_cents:
              type: integer
    CatalogMeta:
      type: object
      required: [next_cursor, prev_cursor, per_page, total]
      properties:
        next_cursor:
          type: [string, 'null']
        prev_cursor:
          type: [string, 'null']
        per_page:
          type: integer
        total:
          type: integer
        facets:
          $ref: '#/components/schemas/CatalogFacets'
    ProductListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/ProductSummary'
        meta:
          $ref: '#/components/schemas/CatalogMeta'
        errors:
          type: array
          maxItems: 0
    ProductEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/ProductDetail'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    BundleListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Bundle'
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
| ~~1~~ | ~~`GET /products`, `GET /products/{slug}`, `GET /products/{slug}/related`, `GET /bundles`~~ — livrés |
| 2 | `GET/POST/PATCH/DELETE /cart`, `POST /cart/coupon`, `GET /shipping/cities`, `POST /orders`, `GET /orders/{number}` |
| 3 | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `GET/POST /me/addresses`, `GET /me/orders` |
| 4 | `/admin/products`, `/admin/orders`, `/admin/stock`, `/admin/coupons` |
| 6 | `POST /ai/chat` (budget de tokens plafonné) |

Chaque ajout met à jour ce fichier et la spécification OpenAPI dans le même commit.
