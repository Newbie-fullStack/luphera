# Contrat API — v1

Base locale : `http://localhost:8000/api/v1`. Toutes les réponses sont en JSON, `Accept: application/json` et `X-Requested-With: XMLHttpRequest` recommandés.

Ce document décrit les endpoints **disponibles en phase 0, 1 et 2**. Le contrat complet (compte, admin, contenus) est ajouté au fil des phases ; la spécification OpenAPI ci-dessous en est la source de vérité.

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
| `api` | Catalogue, panier, livraison | 120 requêtes / minute / IP |
| `auth` | Connexion, inscription | 5 tentatives / minute / identifiant, 20 / minute / IP |
| `orders` | Création et suivi de commande | 10 requêtes / minute / IP |
| `public-forms` | Contact, newsletter | 5 requêtes / minute / IP |
| `ai` | Assistant (phase 6) | 12 requêtes / minute / utilisateur, 300 / jour / IP |

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

## Endpoints phase 2 — panier, livraison, commande

Le panier est **anonyme** : aucun compte n'est requis. Chaque panier est identifié par un jeton opaque (ULID) que le client renvoie dans l'en-tête `X-Cart-Token`. Le serveur renvoie ce jeton dans `meta.cart_token` et dans l'en-tête `X-Cart-Token` de chaque réponse panier.

Règles structurantes :

- Le client n'envoie **jamais** de prix, de remise ni de frais. `PricingService` recalcule tout depuis la base à chaque lecture, y compris au moment de la commande.
- Une ligne est plafonnée à 10 unités (`MAX_LINE_QUANTITY`) et à la quantité réellement en stock.
- Le stock est décrémenté sous verrou (`lockForUpdate`) dans la transaction de commande : deux commandes simultanées ne peuvent pas vendre le même flacon.
- Le stock exact n'est jamais exposé : seulement `stock_status` (`in_stock`, `low_stock`, `out_of_stock`) et `max_quantity`.

### En-têtes

| En-tête | Requis | Rôle |
| --- | --- | --- |
| `X-Cart-Token` | Panier existant | Jeton opaque renvoyé par la première réponse panier |
| `Idempotency-Key` | Recommandé sur `POST /orders` | Clé unique : une seconde requête avec la même clé renvoie la même commande |
| `X-Order-Token` | Alternative à `?token=` | Preuve de possession pour consulter une commande |

### `GET /api/v1/cart`

Renvoie le panier du jeton, ou en crée un vide si le jeton est absent ou inconnu. `?city=<slug>` chiffre la livraison pour cette ville.

```json
{
  "data": {
    "id": "01M7CEEFAVYY6ZH8JX8W2DMMTK",
    "item_count": 1,
    "items": [
      {
        "id": "01M7CEEFAVYY6ZH8JX8W2DMMTM",
        "quantity": 1,
        "unit_price_cents": 69000,
        "line_total_cents": 69000,
        "stock_status": "in_stock",
        "max_quantity": 10,
        "variant": { "id": "01M7CEEFAVYY6ZH8JX8W2DMMTN", "label": "50 ml", "size_ml": 50 },
        "product": {
          "slug": "luphera-noir",
          "name": "Luphéra Noir",
          "image": { "url": "/images/flacons/flacon-noir.webp", "alt": "Flacon Luphéra Noir, verre noir et or" }
        }
      }
    ],
    "coupon": {
      "code": "LUPHERA10",
      "type": "percentage",
      "value": 10,
      "discount_cents": 6900,
      "applies": true
    },
    "totals": {
      "subtotal_cents": 69000,
      "discount_cents": 6900,
      "shipping_cents": 3500,
      "total_cents": 65600
    },
    "shipping": {
      "free_threshold_cents": 80000,
      "free_shipping": false,
      "remaining_cents": 17900
    },
    "city": null,
    "currency": "MAD"
  },
  "meta": { "cart_token": "01M7CEEFAVYY6ZH8JX8W2DMMTK" },
  "errors": []
}
```

`shipping.remaining_cents` est calculé sur le sous-total **après remise** ; la livraison est offerte à partir de 80 000 centimes (800 MAD).

### `POST /api/v1/cart/items`

```json
{ "variant_id": "01M7CEEFAVYY6ZH8JX8W2DMMTN", "quantity": 2 }
```

Réponse `200` : le panier complet. Une variante déjà présente est fusionnée dans la même ligne.

| Cas | Statut | `errors.code` |
| --- | --- | --- |
| Variante inconnue ou supprimée | `404` | `variant_not_found` |
| Quantité demandée > stock | `422` | `insufficient_stock` |
| Quantité < 1 ou > 10 | `422` | `validation_error` |

### `PATCH /api/v1/cart/items/{item}` et `DELETE /api/v1/cart/items/{item}`

`{item}` est l'ULID public de la ligne. `PATCH` accepte `{ "quantity": 3 }` et renvoie le panier ; `DELETE` renvoie le panier sans la ligne. Une ligne d'un autre panier répond `404`.

### `POST /api/v1/cart/coupon` et `DELETE /api/v1/cart/coupon`

`{ "code": "LUPHERA10" }`, insensible à la casse. Un seul code par commande. `DELETE` retire le code.

| Cas | Statut | `errors.code` |
| --- | --- | --- |
| Code inconnu ou inactif | `422` | `coupon_not_found` |
| Sous-total inférieur au minimum | `422` | `coupon_minimum` |
| Dates expirées ou quota atteint | `422` | `coupon_unavailable` |

Le coupon de démonstration `LUPHERA10` vaut 10 % plafonnés à 20 000 centimes, à partir de 50 000 centimes de sous-total, 500 utilisations maximum.

### `GET /api/v1/shipping/cities`

Villes actives, triées par position. `fee_cents` et `delivery_days` sont des valeurs de démonstration semées.

```json
{
  "data": [
    { "slug": "casablanca", "name": "Casablanca", "fee_cents": 2500, "delivery_days": "24 à 48 h" }
  ],
  "meta": {},
  "errors": []
}
```

### `GET /api/v1/shipping/quote?city=<slug>&subtotal_cents=<int>`

Devis de livraison pour une ville, offert au-dessus du seuil. `subtotal_cents` est facultatif : sans lui, le tarif de la ville s'applique.

```json
{
  "data": {
    "city": { "slug": "casablanca", "name": "Casablanca" },
    "fee_cents": 2500,
    "delivery_days": "24 à 48 h",
    "free_threshold_cents": 80000,
    "flat_fee_cents": 3500,
    "free_shipping": false
  },
  "meta": {},
  "errors": []
}
```

Ville inconnue ou inactive : `422` `validation_error`.

### `POST /api/v1/orders`

Transforme le panier en commande. Sans compte : nom, téléphone, ville, quartier, adresse, repère et note facultative, paiement à la livraison, CGV acceptées. Le téléphone est normalisé en `+212…` avant validation.

```json
{
  "customer_name": "Salma Bennani",
  "phone": "06 12 34 56 78",
  "email": null,
  "city": "casablanca",
  "district": "Maarif",
  "address": "12 rue des Orangers",
  "landmark": "En face de la pharmacie",
  "note": "Appeler avant de livrer.",
  "payment_method": "cod",
  "terms": true
}
```

`201` : commande complète (voir ci-dessous), en-tête `X-Order-Number`, `data.tracking.token` renvoyé **une seule fois**. Le panier est vidé, le stock décrémenté, un mouvement de stock et un événement `pending` sont écrits.

| Cas | Statut | `errors.code` |
| --- | --- | --- |
| Panier vide | `422` | `cart_empty` |
| Stock insuffisant entre-temps | `422` | `insufficient_stock` |
| Variante retirée du catalogue | `404` | `variant_not_found` |
| Coupon devenu invalide | `422` | `coupon_unavailable` |
| Champ invalide | `422` | `validation_error` |

`Idempotency-Key` : deux appels avec la même clé renvoient la même commande sans recréer ni redécrémenter le stock.

### `GET /api/v1/orders/{number}`

Suivi public. Le numéro seul ne suffit pas : il faut `?token=<tracking_token>`, l'en-tête `X-Order-Token`, ou `?phone=<téléphone utilisé>`. Sinon `404` `not_found`, pour empêcher l'énumération. `data.tracking` vaut `null` quand la preuve est le téléphone.

```json
{
  "data": {
    "number": "LPH-261115-1280",
    "status": "pending",
    "placed_at": "2026-11-15T02:12:00+00:00",
    "customer": { "name": "Salma Bennani", "phone": "+212612345678", "email": null },
    "address": {
      "city": "Casablanca",
      "city_slug": "casablanca",
      "district": "Maarif",
      "line1": "12 rue des Orangers",
      "landmark": "En face de la pharmacie"
    },
    "note": null,
    "items": [
      {
        "product_slug": "luphera-noir",
        "product_name": "Luphéra Noir",
        "variant_label": "50 ml",
        "sku": "LPH-NOIR-50",
        "unit_price_cents": 69000,
        "quantity": 1,
        "line_total_cents": 69000
      }
    ],
    "totals": { "subtotal_cents": 69000, "discount_cents": 6900, "shipping_cents": 2500, "total_cents": 64600 },
    "coupon_code": "LUPHERA10",
    "payment_method": "cod",
    "events": [{ "status": "pending", "at": "2026-11-15T02:12:00+00:00", "comment": null }],
    "shipment": null,
    "tracking": null,
    "currency": "MAD"
  },
  "meta": {},
  "errors": []
}
```

### Statuts de commande

```
pending → confirmed → preparing → shipped → delivered
pending | confirmed | preparing → cancelled
shipped → failed_delivery
delivered → returned
```

Les statuts terminaux (`cancelled`, `returned`, `failed_delivery`) refusent toute transition. `cancelled`, `failed_delivery` et `returned` remettent les quantités en stock et écrivent un mouvement positif.

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
  - name: Commerce
    description: Panier anonyme, coupons et livraison
  - name: Orders
    description: Commande sans compte et suivi public
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
  /shipping/cities:
    get:
      tags: [Commerce]
      summary: Villes de livraison actives
      operationId: listShippingCities
      responses:
        '200':
          description: Villes actives triées par position
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CityListEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /shipping/quote:
    get:
      tags: [Commerce]
      summary: Devis de livraison pour une ville
      operationId: quoteShipping
      parameters:
        - name: city
          in: query
          required: true
          schema:
            type: string
        - name: subtotal_cents
          in: query
          schema:
            type: integer
            minimum: 0
      responses:
        '200':
          description: Frais de livraison, offerts au-dessus du seuil
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ShippingQuoteEnvelope'
        '422':
          description: Ville inconnue ou inactive
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /cart:
    get:
      tags: [Commerce]
      summary: Panier du jeton, créé si absent
      operationId: getCart
      parameters:
        - name: X-Cart-Token
          in: header
          schema:
            type: string
        - name: city
          in: query
          description: Slug de ville pour chiffrer la livraison
          schema:
            type: string
      responses:
        '200':
          description: Panier et totaux recalculés par le serveur
          headers:
            X-Cart-Token:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CartEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /cart/items:
    post:
      tags: [Commerce]
      summary: Ajouter une variante au panier
      operationId: addCartItem
      parameters:
        - name: X-Cart-Token
          in: header
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [variant_id, quantity]
              properties:
                variant_id:
                  type: string
                  description: ULID public de la variante
                quantity:
                  type: integer
                  minimum: 1
                  maximum: 10
      responses:
        '200':
          description: Panier mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CartEnvelope'
        '404':
          description: Variante introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Stock insuffisant ou quantité invalide
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /cart/items/{item}:
    parameters:
      - name: item
        in: path
        required: true
        schema:
          type: string
      - name: X-Cart-Token
        in: header
        schema:
          type: string
    patch:
      tags: [Commerce]
      summary: Modifier la quantité d'une ligne
      operationId: updateCartItem
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [quantity]
              properties:
                quantity:
                  type: integer
                  minimum: 1
                  maximum: 10
      responses:
        '200':
          description: Panier mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CartEnvelope'
        '404':
          description: Ligne introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Stock insuffisant
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
    delete:
      tags: [Commerce]
      summary: Retirer une ligne
      operationId: removeCartItem
      responses:
        '200':
          description: Panier mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CartEnvelope'
        '404':
          description: Ligne introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /cart/coupon:
    post:
      tags: [Commerce]
      summary: Appliquer un code promo
      operationId: applyCoupon
      parameters:
        - name: X-Cart-Token
          in: header
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code]
              properties:
                code:
                  type: string
                  maxLength: 40
      responses:
        '200':
          description: Panier avec le code appliqué
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CartEnvelope'
        '422':
          description: Code inconnu, minimum non atteint ou quota épuisé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
    delete:
      tags: [Commerce]
      summary: Retirer le code promo
      operationId: removeCoupon
      parameters:
        - name: X-Cart-Token
          in: header
          schema:
            type: string
      responses:
        '200':
          description: Panier sans code
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CartEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /orders:
    post:
      tags: [Orders]
      summary: Transformer le panier en commande
      operationId: placeOrder
      parameters:
        - name: X-Cart-Token
          in: header
          schema:
            type: string
        - name: Idempotency-Key
          in: header
          description: Rejoue la même commande au lieu d'en créer une seconde
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderRequest'
      responses:
        '201':
          description: Commande créée, panier vidé, stock décrémenté
          headers:
            X-Order-Number:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderEnvelope'
        '404':
          description: Variante retirée du catalogue
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Panier vide, stock insuffisant ou champ invalide
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /orders/{number}:
    get:
      tags: [Orders]
      summary: Suivi public d'une commande
      operationId: getOrder
      parameters:
        - name: number
          in: path
          required: true
          schema:
            type: string
            examples: [LPH-261115-1280]
        - name: token
          in: query
          description: Jeton de suivi renvoyé à la création
          schema:
            type: string
        - name: phone
          in: query
          description: Téléphone utilisé lors de la commande
          schema:
            type: string
        - name: X-Order-Token
          in: header
          schema:
            type: string
      responses:
        '200':
          description: Commande, articles, totaux et historique
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderEnvelope'
        '404':
          description: Numéro inconnu ou preuve absente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
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
    CartLine:
      type: object
      required: [id, quantity, unit_price_cents, line_total_cents, stock_status, max_quantity, variant, product]
      properties:
        id:
          type: string
          description: ULID public de la ligne
        quantity:
          type: integer
          minimum: 1
          maximum: 10
        unit_price_cents:
          type: integer
          minimum: 0
        line_total_cents:
          type: integer
          minimum: 0
        stock_status:
          type: string
          enum: [in_stock, low_stock, out_of_stock]
        max_quantity:
          type: integer
          minimum: 0
        variant:
          type: object
          required: [id, label, size_ml]
          properties:
            id:
              type: string
            label:
              type: string
            size_ml:
              type: integer
        product:
          type: object
          required: [slug, name, image]
          properties:
            slug:
              type: string
            name:
              type: string
            image:
              oneOf:
                - $ref: '#/components/schemas/ProductImage'
                - type: 'null'
    CartCoupon:
      type: object
      required: [code, type, value, discount_cents, applies]
      properties:
        code:
          type: string
        type:
          type: string
          enum: [percentage, fixed]
        value:
          type: integer
          description: Pourcentage entier ou centimes selon le type
        discount_cents:
          type: integer
          minimum: 0
        applies:
          type: boolean
    CartTotals:
      type: object
      required: [subtotal_cents, discount_cents, shipping_cents, total_cents]
      properties:
        subtotal_cents:
          type: integer
          minimum: 0
        discount_cents:
          type: integer
          minimum: 0
        shipping_cents:
          type: integer
          minimum: 0
        total_cents:
          type: integer
          minimum: 0
    CartShipping:
      type: object
      required: [free_threshold_cents, free_shipping, remaining_cents]
      properties:
        free_threshold_cents:
          type: integer
          minimum: 0
        free_shipping:
          type: boolean
        remaining_cents:
          type: integer
          minimum: 0
    Cart:
      type: object
      required: [id, item_count, items, totals, shipping, currency]
      properties:
        id:
          type: string
          description: ULID public du panier
        item_count:
          type: integer
          minimum: 0
        items:
          type: array
          items:
            $ref: '#/components/schemas/CartLine'
        coupon:
          oneOf:
            - $ref: '#/components/schemas/CartCoupon'
            - type: 'null'
        totals:
          $ref: '#/components/schemas/CartTotals'
        shipping:
          $ref: '#/components/schemas/CartShipping'
        city:
          oneOf:
            - type: object
              required: [slug, name, delivery_days]
              properties:
                slug:
                  type: string
                name:
                  type: string
                delivery_days:
                  type: string
            - type: 'null'
        currency:
          type: string
          const: MAD
    CartEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Cart'
        meta:
          type: object
          required: [cart_token]
          properties:
            cart_token:
              type: string
        errors:
          type: array
          maxItems: 0
    City:
      type: object
      required: [slug, name, fee_cents, delivery_days]
      properties:
        slug:
          type: string
        name:
          type: string
        fee_cents:
          type: integer
          minimum: 0
        delivery_days:
          type: string
    CityListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/City'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    ShippingQuote:
      type: object
      required: [city, fee_cents, delivery_days, free_threshold_cents, flat_fee_cents, free_shipping]
      properties:
        city:
          type: object
          required: [slug, name]
          properties:
            slug:
              type: string
            name:
              type: string
        fee_cents:
          type: integer
          minimum: 0
        delivery_days:
          type: string
        free_threshold_cents:
          type: integer
          minimum: 0
        flat_fee_cents:
          type: integer
          minimum: 0
        free_shipping:
          type: boolean
    ShippingQuoteEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/ShippingQuote'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    OrderRequest:
      type: object
      required: [customer_name, phone, city, district, address, payment_method, terms]
      properties:
        customer_name:
          type: string
          minLength: 2
          maxLength: 120
        phone:
          type: string
          description: Format marocain, normalisé en +212 côté serveur
        email:
          type: [string, 'null']
          format: email
        city:
          type: string
          description: Slug d'une ville active
        district:
          type: string
          minLength: 2
          maxLength: 80
        address:
          type: string
          minLength: 5
          maxLength: 200
        landmark:
          type: [string, 'null']
          maxLength: 120
        note:
          type: [string, 'null']
          maxLength: 500
        payment_method:
          type: string
          const: cod
        terms:
          type: boolean
          const: true
    OrderItem:
      type: object
      required: [product_slug, product_name, sku, unit_price_cents, quantity, line_total_cents]
      properties:
        product_slug:
          type: string
        product_name:
          type: string
        variant_label:
          type: [string, 'null']
        sku:
          type: string
        unit_price_cents:
          type: integer
          minimum: 0
        quantity:
          type: integer
          minimum: 1
        line_total_cents:
          type: integer
          minimum: 0
    OrderEvent:
      type: object
      required: [status, at]
      properties:
        status:
          type: string
          enum: [pending, confirmed, preparing, shipped, delivered, cancelled, returned, failed_delivery]
        at:
          type: [string, 'null']
          format: date-time
        comment:
          type: [string, 'null']
    Order:
      type: object
      required: [number, status, customer, address, items, totals, payment_method, events, currency]
      properties:
        number:
          type: string
          examples: [LPH-261115-1280]
        status:
          type: string
          enum: [pending, confirmed, preparing, shipped, delivered, cancelled, returned, failed_delivery]
        placed_at:
          type: [string, 'null']
          format: date-time
        customer:
          type: object
          required: [name, phone]
          properties:
            name:
              type: string
            phone:
              type: string
            email:
              type: [string, 'null']
        address:
          type: object
          required: [city, city_slug, district, line1]
          properties:
            city:
              type: string
            city_slug:
              type: string
            district:
              type: string
            line1:
              type: string
            landmark:
              type: [string, 'null']
        note:
          type: [string, 'null']
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
        totals:
          $ref: '#/components/schemas/CartTotals'
        coupon_code:
          type: [string, 'null']
        payment_method:
          type: string
          const: cod
        events:
          type: array
          items:
            $ref: '#/components/schemas/OrderEvent'
        shipment:
          oneOf:
            - type: object
              properties:
                carrier:
                  type: [string, 'null']
                tracking_number:
                  type: [string, 'null']
                status:
                  type: string
                shipped_at:
                  type: [string, 'null']
                delivered_at:
                  type: [string, 'null']
            - type: 'null'
        tracking:
          oneOf:
            - type: object
              required: [token]
              properties:
                token:
                  type: string
            - type: 'null'
        currency:
          type: string
          const: MAD
    OrderEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Order'
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
| ~~2~~ | ~~`GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/{item}`, `POST/DELETE /cart/coupon`, `GET /shipping/cities`, `GET /shipping/quote`, `POST /orders`, `GET /orders/{number}`~~ — livrés |
| 3 | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `GET/POST /me/addresses`, `GET /me/orders` |
| 4 | `/admin/products`, `/admin/orders`, `/admin/stock`, `/admin/coupons` |
| 6 | `POST /ai/chat` (budget de tokens plafonné) |

Chaque ajout met à jour ce fichier et la spécification OpenAPI dans le même commit.
