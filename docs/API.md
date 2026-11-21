# Contrat API — v1

Base locale : `http://localhost:8000/api/v1`. Toutes les réponses sont en JSON, `Accept: application/json` et `X-Requested-With: XMLHttpRequest` recommandés.

Ce document décrit les endpoints **disponibles en phase 0, 1, 2 et 3**. Le contrat complet (administration, contenus) est ajouté au fil des phases ; la spécification OpenAPI ci-dessous en est la source de vérité.

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

## Endpoints phase 3 — comptes clients

Authentification par **session Sanctum** (cookie `httpOnly`). Le SPA récupère d'abord `/sanctum/csrf-cookie`, puis renvoie le cookie `XSRF-TOKEN` dans l'en-tête `X-XSRF-TOKEN` sur chaque mutation. Aucun token Bearer n'est délivré : le navigateur ne détient qu'un cookie de session.

Le téléphone est normalisé en `+212…` avant validation (inscription, connexion, adresses, commande). `identifier` accepte un téléphone **ou** une adresse e-mail : la présence d'un `@` choisit la colonne.

Règles structurantes :

- Une ressource appartenant à un autre client répond `404`, jamais `403` : l'existence d'une commande ou d'une adresse tierce n'est pas dévoilée.
- Les commandes passées avant l'inscription sont rattachées **à l'inscription uniquement**, si le téléphone normalisé correspond (`OrderClaimService`), via `user_id` et `claimed_at`. La connexion ne réclame jamais de commandes : connaître un numéro ne suffit pas à en prendre possession.
- Le téléphone n'est pas modifiable par `PATCH /me` : le changement exige une vérification SMS, marquée `[à compléter]`.
- `GET /me` répond `401` pour un visiteur : le SPA le traduit en état « non connecté », ce n'est pas une erreur affichée.
- Les routes de compte partagent le limiteur `api` ; inscription, connexion et mots de passe utilisent `auth`.

### `POST /api/v1/auth/register`

```json
{
  "name": "Salma Bennani",
  "phone": "06 12 34 56 78",
  "email": "salma@example.ma",
  "password": "secret123",
  "password_confirmation": "secret123",
  "marketing_opt_in": false
}
```

`201` : le client connecté (ressource utilisateur ci-dessous). La session est ouverte immédiatement et les commandes invité du même téléphone sont rattachées.

| Cas | Statut | `errors.code` |
| --- | --- | --- |
| Champ invalide | `422` | `validation_error` |
| Téléphone déjà utilisé | `422` | `validation_error` (`fields.phone`) |
| E-mail déjà utilisé | `422` | `validation_error` (`fields.email`) |

### `POST /api/v1/auth/login`

```json
{ "identifier": "06 12 34 56 78", "password": "secret123" }
```

`200` : ressource utilisateur, session ouverte. `422` `invalid_credentials` si le couple ne correspond pas (message volontairement générique). `403` `account_disabled` si le compte est désactivé.

### `POST /api/v1/auth/logout`

Session requise. `200` avec `data: null`, session invalidée et jeton CSRF régénéré.

### `POST /api/v1/auth/forgot-password`

```json
{ "email": "salma@example.ma" }
```

`200` toujours, avec le même message, que l'adresse existe ou non. Le lien est envoyé par e-mail (`MAIL_MAILER=log` en local) `[à compléter : gabarit et domaine d'envoi]`.

### `POST /api/v1/auth/reset-password`

```json
{
  "token": "…",
  "email": "salma@example.ma",
  "password": "nouveau123",
  "password_confirmation": "nouveau123"
}
```

`200` si le jeton est valide ; `422` `validation_error` (`fields.email`) s'il est expiré ou inconnu. Tous les tokens existants du compte sont supprimés.

### Ressource utilisateur

```json
{
  "id": "01M7P0AKMD6ZZRHV2JHKVDAP3G",
  "name": "Salma Bennani",
  "phone": "+212612345678",
  "email": "salma@example.ma",
  "phone_verified": false,
  "marketing_opt_in": false,
  "roles": ["customer"],
  "created_at": "2026-11-18T09:12:00+00:00"
}
```

### `GET /api/v1/me`

Renvoie la ressource utilisateur. `401` `unauthenticated` sans session.

### `PATCH /api/v1/me`

`name`, `email` et `marketing_opt_in` seulement. Envoyer `phone` est ignoré : le changement de numéro passe par une vérification SMS `[à compléter]`. `200` renvoie la ressource mise à jour ; `422` `validation_error` sur e-mail déjà pris.

### `GET /api/v1/me/orders`

Commandes du client connecté, de la plus récente à la plus ancienne, 20 par page. `meta` porte `current_page`, `last_page`, `per_page` et `total`. Chaque commande reprend la forme de `GET /orders/{number}` sans `tracking`.

### `GET /api/v1/me/orders/{number}`

Détail d'une commande possédée. `404` `not_found` si elle appartient à quelqu'un d'autre ou n'existe pas.

### `GET /api/v1/me/orders/{number}/invoice`

Facture PDF (`application/pdf`, `Content-Disposition: attachment`). Réservée aux commandes `delivered` : `422` `invoice_unavailable` sinon. `404` `not_found` pour une commande tierce. Les mentions légales du document restent `[à compléter]`.

### `GET /api/v1/me/addresses`

Carnet d'adresses, adresse par défaut en tête puis les plus récemment modifiées.

```json
{
  "data": [
    {
      "id": "01M7P09K2JQ7MZ4GT2XD737XZS",
      "label": "Maison",
      "recipient_name": "Salma Bennani",
      "phone": "+212612345678",
      "city": { "slug": "casablanca", "name": "Casablanca", "delivery_days": "24 à 48 h" },
      "district": "Maarif",
      "address": "12 rue des Orangers",
      "landmark": null,
      "is_default": true
    }
  ],
  "meta": {},
  "errors": []
}
```

### `POST /api/v1/me/addresses` et `PATCH /api/v1/me/addresses/{address}`

`recipient_name`, `phone`, `city` (slug actif), `district` et `address` sont requis à la création ; `label`, `landmark` et `is_default` sont facultatifs. `POST` répond `201`. Invariant : la première adresse devient par défaut, déclarer une adresse par défaut rétrograde les autres, supprimer l'adresse par défaut promeut la plus récente restante. Une adresse tierce répond `404`.

### `DELETE /api/v1/me/addresses/{address}`

`200` avec `data: null`. `404` si l'adresse n'appartient pas au client.

### `GET /api/v1/me/wishlist`

Favoris du client, du plus récent au plus ancien, sous la forme des fiches résumées de `GET /products`.

### `POST /api/v1/me/wishlist`

```json
{ "product_id": "01M7CEEFAVYY6ZH8JX8W2DMMTE" }
```

`201` avec la fiche résumée. Idempotent : ajouter deux fois le même produit ne crée pas de doublon. `404` `product_not_found` si le produit n'existe pas.

### `DELETE /api/v1/me/wishlist/{product}`

`{product}` est l'ULID public du produit. `200` avec `data: null` ; `404` `not_found` si le favori n'existe pas.

### `POST /api/v1/contact`

Formulaire de contact public, limité à cinq envois par minute et par adresse IP.

```json
{
  "name": "Salma Bennani",
  "email": "salma@example.test",
  "phone": "06 12 34 56 78",
  "subject": "Question livraison",
  "message": "Bonjour, quel est le délai de livraison à Fès ?"
}
```

`name`, `email`, `subject` et `message` sont requis ; `phone` est facultatif et normalisé en `+212…`. `website` est un honeypot : toute valeur non vide fait échouer la validation. `201` avec `data.received = true` ; `422` `validation_error` ; `429` `rate_limited`. Le message est stocké, aucun e-mail n'est envoyé : la boîte de réception du back-office fait foi.

### `GET /api/v1/products/{slug}/reviews`

Avis publiés d'un produit, du plus récent au plus ancien. Seuls les avis `approved` sortent. `meta` porte `average`, `count`, `distribution` (notes 5 à 1) et la pagination habituelle. L'auteur est déjà réduit à « Prénom N. ». `404` si le produit n'existe pas ou n'est plus actif.

### `POST /api/v1/me/reviews`

```json
{
  "product_id": "01M7CEEFAVYY6ZH8JX8W2DMMTE",
  "rating": 5,
  "title": "Sillage tenace",
  "body": "Un parfum qui tient toute la journée."
}
```

Réservé à un client connecté. Un avis exige une commande `delivered` contenant ce produit ; il est créé en `pending` et n'apparaît qu'après modération. `201` avec `data.status = pending` ; `403` `review_not_eligible` sans commande livrée ; `422` `already_reviewed` pour un second avis sur le même produit. `throttle:public-forms` s'applique aussi.

## Endpoints phase 4 - back-office

La console consomme la même session Sanctum que la boutique, mais le compte doit
porter un rôle `admin`, `manager` ou `support`. Un client connecté reçoit `403`
avec `errors.code = forbidden` : le back-office n'est pas secret, il est fermé.
Un visiteur reçoit `401`. Les routes sont groupées par permission ; la console
masque les actions à partir du tableau `permissions` renvoyé par `GET /admin/me`,
jamais à partir du nom du rôle.

### Matrice des droits

| Permission | `admin` | `manager` | `support` |
| --- | :-: | :-: | :-: |
| `catalog.view` | ✔ | ✔ | ✔ |
| `catalog.manage` | ✔ | ✔ | — |
| `orders.view` | ✔ | ✔ | ✔ |
| `orders.confirm` | ✔ | ✔ | ✔ |
| `orders.manage` | ✔ | ✔ | — |
| `customers.view` | ✔ | ✔ | ✔ |
| `customers.manage` | ✔ | — | — |
| `marketing.manage` | ✔ | ✔ | — |
| `content.manage` | ✔ | ✔ | — |
| `settings.manage` | ✔ | — | — |
| `audit.view` | ✔ | — | — |
| `reviews.moderate` | ✔ | ✔ | ✔ |
| `messages.view` | ✔ | ✔ | ✔ |
| `messages.manage` | ✔ | ✔ | ✔ |
| `ai.use` | ✔ | ✔ | — |

`admin` contourne toutes les vérifications par un `Gate::before` ; la matrice
ci-dessus documente le comportement attendu, pas une liste dupliquée en base.

### `POST /api/v1/admin/login`

```json
{ "identifier": "admin@luphera.test", "password": "password" }
```

`200` avec la ressource staff. `422` `invalid_credentials` si l'identifiant ou le
mot de passe est faux — le message ne distingue jamais les deux cas. `403`
`account_disabled` pour un compte désactivé, `403` `forbidden` pour un client
sans rôle de back-office.

### `POST /api/v1/admin/logout` et `GET /api/v1/admin/me`

`logout` invalide la session et répond `200` avec `data: null`. `me` renvoie le
compte courant :

```json
{
  "data": {
    "id": "01M7R7DWCSQ54W84BVQN1ZNJ8F",
    "name": "Support Luphéra",
    "phone": "+212600000003",
    "email": "support@luphera.test",
    "roles": ["support"],
    "permissions": ["catalog.view", "customers.view", "orders.confirm", "orders.view"],
    "last_login_at": "2026-11-18T21:04:11+00:00"
  },
  "meta": {},
  "errors": []
}
```

### `GET /api/v1/admin/dashboard`

Agrégats des trente derniers jours, mis en cache cinq minutes :

```json
{
  "data": {
    "revenue_30d_cents": 47500,
    "orders_30d": 1,
    "orders_today": 1,
    "orders_pending": 1,
    "average_basket_30d_cents": 47500,
    "confirmation_rate_30d": 0,
    "customers_total": 1,
    "customers_new_30d": 1,
    "low_stock": [
      {
        "id": "01M7R7DWCSQ54W84BVQN1ZNJ8F",
        "sku": "LPH-AMBRE-100",
        "label": "100 ml",
        "stock": 4,
        "threshold": 5,
        "product": { "slug": "luphera-ambre", "name": "Luphéra Ambre" }
      }
    ],
    "top_products": [{ "name": "Luphéra Noir", "quantity": 1, "revenue_cents": 45000 }],
    "sales_by_city": [{ "city": "Casablanca", "orders": 1, "revenue_cents": 47500 }],
    "series": [{ "date": "2026-10-20", "orders": 0, "revenue_cents": 0 }]
  },
  "meta": {},
  "errors": []
}
```

`revenue_30d_cents` ignore les commandes annulées ; `series` couvre toujours
trente entrées, jours vides compris.

### `GET /api/v1/admin/orders`

Filtres : `status`, `city`, `q` (numéro, nom ou téléphone), `from`, `to`, `page`.
La file place les commandes `pending` en tête, puis trie par date décroissante.
Chaque ligne reprend la ressource publique de commande plus `items_count` et
`needs_confirmation`.

### `GET /api/v1/admin/orders/{number}`

Ressource publique enrichie de `items_count`, `needs_confirmation` et de
l'historique :

```json
{
  "events": [
    {
      "status": "confirmed",
      "at": "2026-11-18T21:12:44+00:00",
      "author": "Support Luphéra",
      "comment": "Client joint, adresse confirmée."
    }
  ]
}
```

### `PATCH /api/v1/admin/orders/{number}/status`

```json
{ "status": "shipped", "carrier": "Amana", "tracking_number": "AMN-123456", "comment": "Départ entrepôt" }
```

`status` doit être une transition légale de l'enum. `orders.confirm` autorise
uniquement `pending → confirmed` ; toute autre transition exige `orders.manage`.
`422` `invalid_transition` sinon. `carrier` et `tracking_number` sont attendus
pour `shipped`.

### `GET /api/v1/admin/orders/{number}/packing-slip`

PDF texte (bon de livraison) : articles, quantités, adresse, aucun prix.

### `GET /api/v1/admin/orders/export`

CSV des commandes filtrées, mêmes filtres que la liste.

### `GET|POST /api/v1/admin/products`, `GET|PATCH|DELETE /api/v1/admin/products/{product}`

`{product}` est l'ULID public. La liste accepte `q`, `status`, `line`, `page` et
renvoie pour chaque produit `variants_count`, `stock_total` et le prix
d'entrée. La fiche complète ajoute description, notes olfactives, variantes,
médias et bloc SEO.

`DELETE` archive : le produit reste lisible dans l'historique des commandes et
disparaît du catalogue public. `POST /publish` et `POST /unpublish` changent le
statut sans passer par `PATCH`.

### Variantes, notes et médias

| Route | Effet |
| --- | --- |
| `POST /admin/products/{product}/variants` | Crée une variante (`sku`, `size_ml`, `price_cents`, `stock`, `low_stock_threshold`, `is_default`) |
| `PATCH/DELETE /admin/variants/{variant}` | Met à jour ou supprime une variante |
| `PUT /admin/products/{product}/notes` | Remplace la pyramide olfactive (`notes[]` avec `level` et `name`) |
| `POST /admin/products/{product}/media` | Ajoute un média (`url`, `alt`, `position`) |
| `PATCH/DELETE /admin/media/{media}` | Met à jour ou supprime un média |

Chaque écriture répond avec la fiche produit complète et journalise une ligne
d'audit.

### `GET /api/v1/admin/stock` et `GET /admin/stock/movements`

`GET /stock` liste les variantes (`q`, `low=1`, `page`) avec `stock`,
`threshold` et `status` (`in_stock`, `low_stock`, `out_of_stock`).
`GET /stock/movements` renvoie les trente derniers mouvements, filtrables par
`variant_id` (ULID) : date, SKU, produit, motif, quantité signée, auteur, note.

### `POST /api/v1/admin/stock/adjust`

```json
{ "variant_id": "01M7R7DWCSQ54W84BVQN1ZNJ8F", "delta": -2, "reason": "adjust", "note": "Casse en boutique" }
```

`reason` vaut `restock` ou `adjust`. `422` `negative_stock` si le stock
deviendrait négatif. Réponse : `id`, `sku`, `stock`, `status`.

### `POST /api/v1/admin/stock/import` et `GET /admin/stock/export`

Import `multipart/form-data` d'un CSV `sku;stock`. La valeur cible remplace le
stock actuel ; les lignes invalides sont rapportées sans annuler les autres :

```json
{ "updated": 12, "errors": [{ "line": 4, "message": "SKU inconnu : LPH-XXX" }] }
```

L'export produit le même format.

### `GET /api/v1/admin/customers`, `GET /admin/customers/{customer}`

`{customer}` est l'ULID public. La liste accepte `q`, `active` et `page` et
renvoie `orders_count`, `spent_cents` (commandes non annulées), `last_order_at`,
`is_active`. La fiche ajoute segment (`vip`, `new`, `regular`, `inactive`),
adresses, commandes et notes internes.

### `PATCH /api/v1/admin/customers/{customer}` et `POST /admin/customers/{customer}/notes`

`{ "is_active": false }` désactive le compte (la connexion répond alors `403`
`account_disabled`). Les notes sont horodatées et attribuées à leur auteur ;
elles ne sont jamais visibles côté boutique.

### `GET|POST /api/v1/admin/coupons`, `PATCH|DELETE /api/v1/admin/coupons/{coupon}`

`{coupon}` est l'identifiant entier. Un coupon déjà utilisé est désactivé au
lieu d'être supprimé ; la réponse indique alors le coupon désactivé.

### `GET|PUT /api/v1/admin/settings`

Payload imbriqué, valeurs effectives (repli de configuration inclus) :

```json
{
  "brand": { "tagline": "Avancer sans bruit, laisser une trace d'or.", "whatsapp": "[à compléter]", "email": "[à compléter]" },
  "announcement": { "text": "", "active": false },
  "shipping": { "flat_fee_cents": 3500, "free_threshold_cents": 80000 }
}
```

Seules ces clés sont acceptées ; les autres sont ignorées. Toute modification
est journalisée avec l'écart avant/après.

### `GET|POST /api/v1/admin/pages`, `GET|PATCH|DELETE /api/v1/admin/pages/{page}`

`{page}` est l'identifiant entier. Champs : `title`, `slug`, `body`,
`meta_title`, `meta_description`, `is_published`. Le slug est dérivé du titre
quand il est absent ; une page publiée est lisible via l'API publique.

### `GET /api/v1/admin/messages`, `GET|PATCH /admin/messages/{message}`

Boîte de réception du formulaire de contact, réservée à `messages.view` en
lecture et `messages.manage` pour changer le statut. `GET` accepte `status`
(`new`, `read`, `replied`, `archived`), `q` et `page`, et renvoie `meta.new_count`.
La fiche ajoute `body`, `user_agent` et le client rattaché s'il est connecté.
`PATCH` attend `{ "status": "replied" }` : passer à `read`, `replied` ou
`archived` renseigne `read_at`, et `replied` renseigne `replied_at`. Chaque
changement écrit une ligne d'audit `message.updated`.

### `GET /api/v1/admin/reviews`, `PATCH /admin/reviews/{review}`

File de modération réservée à `reviews.moderate`. `GET` filtre par `status`
(`pending`, `approved`, `rejected`) et `q`, et renvoie `meta.pending_count`.
`PATCH` accepte `{ "status": "approved" | "rejected", "moderation_note": "…" }` ;
seul un avis approuvé devient lisible par la boutique. Chaque décision écrit une
ligne d'audit `review.moderated`.

### `GET /api/v1/admin/audit-logs` et `GET /admin/audit-logs/actions`

Journal append-only, filtrable par `action`, `q`, `from`, `to`, `page`. Chaque
entrée porte `action`, `subject_type`, `subject_label`, `author`, `ip`,
`user_agent` et `changes` (écart avant/après, `null` si sans objet).
`/actions` liste les actions distinctes pour alimenter le filtre.

### `GET /api/v1/pages` et `GET /api/v1/pages/{slug}`

Endpoints publics, sans authentification : uniquement les pages publiées. `404`
`not_found` pour un brouillon ou un slug inconnu. La liste est triée par
`position` puis par titre.

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
  - name: Account
    description: Session, profil, adresses, favoris et facture du client
  - name: Content
    description: Pages éditoriales, contact et avis publiés
  - name: Back-office
    description: Console de gestion réservée aux rôles staff
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
  /auth/register:
    post:
      tags: [Account]
      summary: Créer un compte client et ouvrir la session
      operationId: registerCustomer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: Compte créé, session ouverte, commandes invité rattachées
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserEnvelope'
        '422':
          description: Champ invalide, téléphone ou e-mail déjà utilisé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /auth/login:
    post:
      tags: [Account]
      summary: Ouvrir une session avec un téléphone ou un e-mail
      operationId: loginCustomer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Session ouverte
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserEnvelope'
        '403':
          description: Compte désactivé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Identifiants incorrects
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /auth/logout:
    post:
      tags: [Account]
      summary: Fermer la session
      operationId: logoutCustomer
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Session invalidée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NullEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
  /auth/forgot-password:
    post:
      tags: [Account]
      summary: Envoyer un lien de réinitialisation
      operationId: forgotPassword
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email:
                  type: string
                  format: email
      responses:
        '200':
          description: Message identique que l'adresse existe ou non
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /auth/reset-password:
    post:
      tags: [Account]
      summary: Définir un nouveau mot de passe avec un jeton
      operationId: resetPassword
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, email, password, password_confirmation]
              properties:
                token:
                  type: string
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                password_confirmation:
                  type: string
                  minLength: 8
      responses:
        '200':
          description: Mot de passe mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageEnvelope'
        '422':
          description: Jeton expiré ou invalide
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/TooManyRequests'
  /me:
    get:
      tags: [Account]
      summary: Profil du client connecté
      operationId: getMe
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Ressource utilisateur
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
    patch:
      tags: [Account]
      summary: Mettre à jour le nom, l'e-mail ou les préférences
      operationId: updateMe
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProfileUpdateRequest'
      responses:
        '200':
          description: Profil mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '422':
          description: Champ invalide ou e-mail déjà pris
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/orders:
    get:
      tags: [Account]
      summary: Commandes du client connecté
      operationId: listMyOrders
      security:
        - sanctumCookie: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Commandes paginées, les plus récentes d'abord
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderListEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
  /me/orders/{number}:
    get:
      tags: [Account]
      summary: Détail d'une commande possédée
      operationId: getMyOrder
      security:
        - sanctumCookie: []
      parameters:
        - name: number
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Commande complète
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '404':
          description: Commande inconnue ou appartenant à un autre client
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/orders/{number}/invoice:
    get:
      tags: [Account]
      summary: Facture PDF d'une commande livrée
      operationId: getMyInvoice
      security:
        - sanctumCookie: []
      parameters:
        - name: number
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Facture PDF
          content:
            application/pdf:
              schema:
                type: string
                format: binary
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '404':
          description: Commande inconnue ou appartenant à un autre client
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Commande pas encore livrée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/addresses:
    get:
      tags: [Account]
      summary: Carnet d'adresses
      operationId: listMyAddresses
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Adresses, celle par défaut en tête
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AddressListEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
    post:
      tags: [Account]
      summary: Ajouter une adresse
      operationId: createMyAddress
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddressInput'
      responses:
        '201':
          description: Adresse créée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AddressEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '422':
          description: Champ invalide ou ville inconnue
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/addresses/{address}:
    parameters:
      - name: address
        in: path
        required: true
        schema:
          type: string
          description: ULID public de l'adresse
    patch:
      tags: [Account]
      summary: Modifier une adresse
      operationId: updateMyAddress
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddressInput'
      responses:
        '200':
          description: Adresse mise à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AddressEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '404':
          description: Adresse inconnue ou appartenant à un autre client
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Champ invalide ou ville inconnue
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
    delete:
      tags: [Account]
      summary: Supprimer une adresse
      operationId: deleteMyAddress
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Adresse supprimée, défaut promu si nécessaire
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NullEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '404':
          description: Adresse inconnue ou appartenant à un autre client
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/wishlist:
    get:
      tags: [Account]
      summary: Favoris du client
      operationId: listMyWishlist
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Fiches résumées des produits favoris
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
    post:
      tags: [Account]
      summary: Ajouter un produit aux favoris
      operationId: addMyWishlist
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [product_id]
              properties:
                product_id:
                  type: string
                  description: ULID public du produit
      responses:
        '201':
          description: Favori enregistré (idempotent)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '404':
          description: Produit introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/wishlist/{product}:
    delete:
      tags: [Account]
      summary: Retirer un produit des favoris
      operationId: removeMyWishlist
      security:
        - sanctumCookie: []
      parameters:
        - name: product
          in: path
          required: true
          schema:
            type: string
            description: ULID public du produit
      responses:
        '200':
          description: Favori retiré
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NullEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '404':
          description: Favori introuvable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /pages:
    get:
      tags: [Content]
      summary: Pages éditoriales publiées
      operationId: listPages
      responses:
        '200':
          description: Pages publiées, triées par position
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PageListEnvelope'
  /pages/{slug}:
    get:
      tags: [Content]
      summary: Lire une page publiée
      operationId: getPage
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Page publiée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PageEnvelope'
        '404':
          description: Brouillon ou slug inconnu
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/login:
    post:
      tags: [Back-office]
      summary: Ouvrir une session staff
      operationId: adminLogin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Session ouverte
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StaffEnvelope'
        '403':
          description: Compte désactivé ou sans rôle staff
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Identifiants incorrects
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/logout:
    post:
      tags: [Back-office]
      summary: Fermer la session staff
      operationId: adminLogout
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Session fermée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NullEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
  /admin/me:
    get:
      tags: [Back-office]
      summary: Compte staff courant et permissions
      operationId: adminMe
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Compte staff
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StaffEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '403':
          description: Session client sans rôle staff
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/dashboard:
    get:
      tags: [Back-office]
      summary: Agrégats du tableau de bord
      operationId: adminDashboard
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Indicateurs des trente derniers jours
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '403':
          description: Permission `orders.view` manquante
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/orders:
    get:
      tags: [Back-office]
      summary: File de commandes
      operationId: adminListOrders
      security:
        - sanctumCookie: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, confirmed, preparing, shipped, delivered, cancelled, returned, failed_delivery]
        - name: city
          in: query
          schema:
            type: string
        - name: q
          in: query
          schema:
            type: string
        - name: from
          in: query
          schema:
            type: string
            format: date
        - name: to
          in: query
          schema:
            type: string
            format: date
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Commandes, `pending` en tête
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminOrderListEnvelope'
        '401':
          $ref: '#/components/responses/Unauthenticated'
        '403':
          description: Permission manquante
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/orders/{number}:
    get:
      tags: [Back-office]
      summary: Détail d'une commande avec son historique
      operationId: adminShowOrder
      security:
        - sanctumCookie: []
      parameters:
        - name: number
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Commande complète
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminOrderEnvelope'
        '404':
          description: Commande inconnue
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/orders/{number}/status:
    patch:
      tags: [Back-office]
      summary: Changer le statut d'une commande
      operationId: adminTransitionOrder
      security:
        - sanctumCookie: []
      parameters:
        - name: number
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderTransitionRequest'
      responses:
        '200':
          description: Commande mise à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminOrderEnvelope'
        '422':
          description: Transition illégale ou transporteur manquant
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/orders/{number}/packing-slip:
    get:
      tags: [Back-office]
      summary: Bon de livraison PDF
      operationId: adminPackingSlip
      security:
        - sanctumCookie: []
      parameters:
        - name: number
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: PDF sans prix
          content:
            application/pdf:
              schema:
                type: string
                format: binary
  /admin/products:
    get:
      tags: [Back-office]
      summary: Liste du catalogue, archives comprises
      operationId: adminListProducts
      security:
        - sanctumCookie: []
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, active, archived]
        - name: line
          in: query
          schema:
            type: string
            enum: [homme, femme, coffret]
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Produits avec variantes et stock agrégé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductListEnvelope'
    post:
      tags: [Back-office]
      summary: Créer un produit en brouillon
      operationId: adminStoreProduct
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AdminProductInput'
      responses:
        '201':
          description: Produit créé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductEnvelope'
        '422':
          description: Validation échouée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/products/{product}:
    get:
      tags: [Back-office]
      summary: Fiche produit complète
      operationId: adminShowProduct
      security:
        - sanctumCookie: []
      parameters:
        - name: product
          in: path
          required: true
          schema:
            type: string
            description: ULID public
      responses:
        '200':
          description: Produit, variantes, notes, médias, SEO
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductEnvelope'
        '404':
          description: Produit inconnu
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
    patch:
      tags: [Back-office]
      summary: Mettre à jour un produit
      operationId: adminUpdateProduct
      security:
        - sanctumCookie: []
      parameters:
        - name: product
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AdminProductInput'
      responses:
        '200':
          description: Produit mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductEnvelope'
        '422':
          description: Validation échouée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
    delete:
      tags: [Back-office]
      summary: Archiver un produit
      operationId: adminArchiveProduct
      security:
        - sanctumCookie: []
      parameters:
        - name: product
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Produit archivé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductEnvelope'
  /admin/products/{product}/publish:
    post:
      tags: [Back-office]
      summary: Publier un produit
      operationId: adminPublishProduct
      security:
        - sanctumCookie: []
      parameters:
        - name: product
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Produit publié
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductEnvelope'
  /admin/products/{product}/unpublish:
    post:
      tags: [Back-office]
      summary: Repasser un produit en brouillon
      operationId: adminUnpublishProduct
      security:
        - sanctumCookie: []
      parameters:
        - name: product
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Produit en brouillon
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProductEnvelope'
  /admin/stock:
    get:
      tags: [Back-office]
      summary: Stock par variante
      operationId: adminStock
      security:
        - sanctumCookie: []
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: low
          in: query
          description: Ne garder que les variantes sous le seuil
          schema:
            type: boolean
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Variantes avec seuil et statut
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StockRowListEnvelope'
  /admin/stock/adjust:
    post:
      tags: [Back-office]
      summary: Ajuster le stock d'une variante
      operationId: adminAdjustStock
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [variant_id, delta, reason]
              properties:
                variant_id:
                  type: string
                  description: ULID public de la variante
                delta:
                  type: integer
                  description: Positif pour une entrée, négatif pour une sortie
                reason:
                  type: string
                  enum: [restock, adjust]
                note:
                  type: [string, 'null']
                  maxLength: 190
      responses:
        '200':
          description: Stock mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StockRowEnvelope'
        '422':
          description: Stock négatif refusé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/stock/movements:
    get:
      tags: [Back-office]
      summary: Derniers mouvements de stock
      operationId: adminStockMovements
      security:
        - sanctumCookie: []
      parameters:
        - name: variant_id
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Mouvements du plus récent au plus ancien
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StockMovementListEnvelope'
  /admin/customers:
    get:
      tags: [Back-office]
      summary: Liste des clients
      operationId: adminListCustomers
      security:
        - sanctumCookie: []
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: active
          in: query
          schema:
            type: boolean
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Clients avec commandes et dépenses agrégées
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminCustomerListEnvelope'
  /admin/customers/{customer}:
    get:
      tags: [Back-office]
      summary: Fiche client
      operationId: adminShowCustomer
      security:
        - sanctumCookie: []
      parameters:
        - name: customer
          in: path
          required: true
          schema:
            type: string
            description: ULID public
      responses:
        '200':
          description: Client, adresses, commandes et notes
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminCustomerEnvelope'
    patch:
      tags: [Back-office]
      summary: Activer ou désactiver un compte
      operationId: adminUpdateCustomer
      security:
        - sanctumCookie: []
      parameters:
        - name: customer
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [is_active]
              properties:
                is_active:
                  type: boolean
      responses:
        '200':
          description: Client mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminCustomerEnvelope'
  /admin/coupons:
    get:
      tags: [Back-office]
      summary: Liste des coupons
      operationId: adminListCoupons
      security:
        - sanctumCookie: []
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Coupons avec compteur d'utilisation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponListEnvelope'
    post:
      tags: [Back-office]
      summary: Créer un coupon
      operationId: adminStoreCoupon
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponInput'
      responses:
        '201':
          description: Coupon créé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponEnvelope'
  /admin/coupons/{coupon}:
    patch:
      tags: [Back-office]
      summary: Mettre à jour un coupon
      operationId: adminUpdateCoupon
      security:
        - sanctumCookie: []
      parameters:
        - name: coupon
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponInput'
      responses:
        '200':
          description: Coupon mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponEnvelope'
    delete:
      tags: [Back-office]
      summary: Supprimer ou désactiver un coupon
      operationId: adminDestroyCoupon
      security:
        - sanctumCookie: []
      parameters:
        - name: coupon
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Coupon supprimé, ou désactivé s'il a déjà servi
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponEnvelope'
  /admin/settings:
    get:
      tags: [Back-office]
      summary: Réglages éditables
      operationId: adminSettings
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Valeurs effectives
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ShopSettingsEnvelope'
    put:
      tags: [Back-office]
      summary: Enregistrer les réglages
      operationId: adminUpdateSettings
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ShopSettings'
      responses:
        '200':
          description: Réglages enregistrés
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ShopSettingsEnvelope'
  /admin/pages:
    get:
      tags: [Back-office]
      summary: Toutes les pages, brouillons compris
      operationId: adminListPages
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Pages triées par position
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PageListEnvelope'
    post:
      tags: [Back-office]
      summary: Créer une page
      operationId: adminStorePage
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PageInput'
      responses:
        '201':
          description: Page créée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PageEnvelope'
  /admin/pages/{page}:
    get:
      tags: [Back-office]
      summary: Lire une page
      operationId: adminShowPage
      security:
        - sanctumCookie: []
      parameters:
        - name: page
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Page complète
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PageEnvelope'
    patch:
      tags: [Back-office]
      summary: Mettre à jour une page
      operationId: adminUpdatePage
      security:
        - sanctumCookie: []
      parameters:
        - name: page
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PageInput'
      responses:
        '200':
          description: Page mise à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PageEnvelope'
    delete:
      tags: [Back-office]
      summary: Supprimer une page
      operationId: adminDestroyPage
      security:
        - sanctumCookie: []
      parameters:
        - name: page
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Page supprimée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NullEnvelope'
  /admin/audit-logs:
    get:
      tags: [Back-office]
      summary: Journal d'audit
      operationId: adminAuditLogs
      security:
        - sanctumCookie: []
      parameters:
        - name: action
          in: query
          schema:
            type: string
        - name: q
          in: query
          schema:
            type: string
        - name: from
          in: query
          schema:
            type: string
            format: date
        - name: to
          in: query
          schema:
            type: string
            format: date
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Entrées append-only
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuditLogListEnvelope'
  /contact:
    post:
      tags: [Content]
      summary: Envoyer un message de contact
      operationId: storeContactMessage
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ContactMessageInput'
      responses:
        '201':
          description: Message reçu
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContactReceiptEnvelope'
        '422':
          description: Payload invalide ou honeypot rempli
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          description: Trop de demandes depuis cette adresse
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /products/{slug}/reviews:
    get:
      tags: [Content]
      summary: Avis publiés d'un produit
      operationId: listProductReviews
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Avis approuvés et agrégats
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReviewListEnvelope'
        '404':
          description: Produit inconnu ou inactif
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /me/reviews:
    post:
      tags: [Account]
      summary: Déposer un avis après livraison
      operationId: storeReview
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReviewInput'
      responses:
        '201':
          description: Avis créé en attente de modération
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReviewEnvelope'
        '403':
          description: Aucune commande livrée pour ce produit
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Avis déjà déposé ou payload invalide
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
  /admin/messages:
    get:
      tags: [Back-office]
      summary: Boîte de réception du formulaire de contact
      operationId: adminMessages
      security:
        - sanctumCookie: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [new, read, replied, archived]
        - name: q
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Messages paginés avec le compteur de non-lus
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminMessageListEnvelope'
  /admin/messages/{message}:
    parameters:
      - name: message
        in: path
        required: true
        schema:
          type: integer
    get:
      tags: [Back-office]
      summary: Lire un message
      operationId: adminMessage
      security:
        - sanctumCookie: []
      responses:
        '200':
          description: Message complet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminMessageEnvelope'
    patch:
      tags: [Back-office]
      summary: Changer le statut d'un message
      operationId: adminMessageStatus
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status:
                  type: string
                  enum: [new, read, replied, archived]
      responses:
        '200':
          description: Message mis à jour
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminMessageEnvelope'
  /admin/reviews:
    get:
      tags: [Back-office]
      summary: File de modération des avis
      operationId: adminReviews
      security:
        - sanctumCookie: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, approved, rejected]
        - name: q
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Avis paginés avec le compteur en attente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminReviewListEnvelope'
  /admin/reviews/{review}:
    parameters:
      - name: review
        in: path
        required: true
        schema:
          type: integer
    patch:
      tags: [Back-office]
      summary: Approuver ou rejeter un avis
      operationId: adminReviewModerate
      security:
        - sanctumCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status:
                  type: string
                  enum: [approved, rejected]
                moderation_note:
                  type: [string, 'null']
      responses:
        '200':
          description: Avis modéré
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminReviewEnvelope'
components:
  securitySchemes:
    sanctumCookie:
      type: apiKey
      in: cookie
      name: luphera_session
      description: Session Sanctum (`httpOnly`), précédée de `GET /sanctum/csrf-cookie`
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
    Unauthenticated:
      description: Session absente ou expirée
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
    NullEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: 'null'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    MessageEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: object
          required: [message]
          properties:
            message:
              type: string
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    RegisterRequest:
      type: object
      required: [name, phone, password, password_confirmation]
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 120
        phone:
          type: string
          description: Format marocain, normalisé en +212 côté serveur
        email:
          type: [string, 'null']
          format: email
        password:
          type: string
          minLength: 8
        password_confirmation:
          type: string
          minLength: 8
        marketing_opt_in:
          type: boolean
          default: false
    LoginRequest:
      type: object
      required: [identifier, password]
      properties:
        identifier:
          type: string
          description: Téléphone ou e-mail ; la présence d'un @ choisit la colonne
        password:
          type: string
    ProfileUpdateRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 120
        email:
          type: [string, 'null']
          format: email
        marketing_opt_in:
          type: boolean
    User:
      type: object
      required: [id, name, phone, phone_verified, marketing_opt_in, roles]
      properties:
        id:
          type: string
          description: ULID public
        name:
          type: string
        phone:
          type: string
          examples: ['+212612345678']
        email:
          type: [string, 'null']
        phone_verified:
          type: boolean
        marketing_opt_in:
          type: boolean
        roles:
          type: array
          items:
            type: string
        created_at:
          type: [string, 'null']
          format: date-time
    UserEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    Address:
      type: object
      required: [id, recipient_name, phone, city, district, address, is_default]
      properties:
        id:
          type: string
          description: ULID public
        label:
          type: [string, 'null']
        recipient_name:
          type: string
        phone:
          type: string
          examples: ['+212612345678']
        city:
          oneOf:
            - type: object
              required: [slug, name]
              properties:
                slug:
                  type: string
                name:
                  type: string
                delivery_days:
                  type: [string, 'null']
            - type: 'null'
        district:
          type: string
        address:
          type: string
        landmark:
          type: [string, 'null']
        is_default:
          type: boolean
    AddressInput:
      type: object
      required: [recipient_name, phone, city, district, address]
      properties:
        label:
          type: [string, 'null']
          maxLength: 40
        recipient_name:
          type: string
          minLength: 2
          maxLength: 120
        phone:
          type: string
          description: Format marocain, normalisé en +212 côté serveur
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
        is_default:
          type: boolean
    AddressEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Address'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    AddressListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Address'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    OrderListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Order'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
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
    Staff:
      type: object
      required: [id, name, phone, roles, permissions]
      properties:
        id:
          type: string
          description: ULID public
        name:
          type: string
        phone:
          type: string
        email:
          type: [string, 'null']
        roles:
          type: array
          items:
            type: string
            enum: [admin, manager, support]
        permissions:
          type: array
          description: Permissions effectives, triées
          items:
            type: string
            examples: ['orders.view']
        last_login_at:
          type: [string, 'null']
          format: date-time
    StaffEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Staff'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    Dashboard:
      type: object
      required:
        - revenue_30d_cents
        - orders_30d
        - orders_pending
        - series
      properties:
        revenue_30d_cents:
          type: integer
          description: Commandes non annulées
        orders_30d:
          type: integer
        orders_today:
          type: integer
        orders_pending:
          type: integer
        average_basket_30d_cents:
          type: integer
        confirmation_rate_30d:
          type: integer
          description: Pourcentage entier
        customers_total:
          type: integer
        customers_new_30d:
          type: integer
        low_stock:
          type: array
          items:
            $ref: '#/components/schemas/StockRow'
        top_products:
          type: array
          items:
            type: object
            required: [name, quantity, revenue_cents]
            properties:
              name:
                type: string
              quantity:
                type: integer
              revenue_cents:
                type: integer
        sales_by_city:
          type: array
          items:
            type: object
            required: [city, orders, revenue_cents]
            properties:
              city:
                type: string
              orders:
                type: integer
              revenue_cents:
                type: integer
        series:
          type: array
          description: Toujours trente entrées, jours vides compris
          items:
            type: object
            required: [date, orders, revenue_cents]
            properties:
              date:
                type: string
                format: date
              orders:
                type: integer
              revenue_cents:
                type: integer
    DashboardEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Dashboard'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    AdminOrderSummary:
      allOf:
        - $ref: '#/components/schemas/Order'
        - type: object
          required: [items_count, needs_confirmation]
          properties:
            items_count:
              type: integer
            needs_confirmation:
              type: boolean
    AdminOrder:
      allOf:
        - $ref: '#/components/schemas/AdminOrderSummary'
        - type: object
          required: [events]
          properties:
            events:
              type: array
              items:
                $ref: '#/components/schemas/OrderEvent'
    AdminOrderListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AdminOrderSummary'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    AdminOrderEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/AdminOrder'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    OrderTransitionRequest:
      type: object
      required: [status]
      properties:
        status:
          type: string
          enum: [confirmed, preparing, shipped, delivered, cancelled, returned, failed_delivery]
        carrier:
          type: [string, 'null']
          description: Attendu pour `shipped`
        tracking_number:
          type: [string, 'null']
        comment:
          type: [string, 'null']
          maxLength: 500
    AdminProductSummary:
      type: object
      required: [id, slug, name, line, status, variants_count, stock_total, from_price_cents]
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
        status:
          type: string
          enum: [draft, active, archived]
        variants_count:
          type: integer
        stock_total:
          type: integer
        from_price_cents:
          type: integer
    AdminProduct:
      allOf:
        - $ref: '#/components/schemas/AdminProductSummary'
        - type: object
          properties:
            tag:
              type: [string, 'null']
            short_description:
              type: string
            description:
              type: string
            intensity:
              type: [integer, 'null']
            longevity:
              type: [integer, 'null']
            sillage:
              type: [integer, 'null']
            season:
              type: [string, 'null']
            occasion:
              type: [string, 'null']
            variants:
              type: array
              items:
                $ref: '#/components/schemas/ProductVariant'
            notes:
              type: array
              items:
                type: object
                required: [level, name]
                properties:
                  level:
                    type: string
                    enum: [top, heart, base]
                  name:
                    type: string
            media:
              type: array
              items:
                $ref: '#/components/schemas/ProductMedia'
            seo:
              type: object
              properties:
                title:
                  type: [string, 'null']
                description:
                  type: [string, 'null']
    AdminProductInput:
      type: object
      required: [name, line, family, short_description, description]
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 120
        line:
          type: string
          enum: [homme, femme, coffret]
        family:
          type: string
          maxLength: 64
        tag:
          type: [string, 'null']
          maxLength: 32
        short_description:
          type: string
          maxLength: 200
        description:
          type: string
          minLength: 20
        intensity:
          type: [integer, 'null']
          minimum: 1
          maximum: 5
        longevity:
          type: [integer, 'null']
          minimum: 1
          maximum: 5
        sillage:
          type: [integer, 'null']
          minimum: 1
          maximum: 5
        season:
          type: [string, 'null']
        occasion:
          type: [string, 'null']
        seo_title:
          type: [string, 'null']
          maxLength: 190
        seo_description:
          type: [string, 'null']
          maxLength: 320
    AdminProductListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AdminProductSummary'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    AdminProductEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/AdminProduct'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    StockRow:
      type: object
      required: [id, sku, stock, threshold, status]
      properties:
        id:
          type: string
          description: ULID public de la variante
        sku:
          type: string
        label:
          type: [string, 'null']
        stock:
          type: integer
        threshold:
          type: integer
        status:
          type: string
          enum: [in_stock, low_stock, out_of_stock]
        product:
          type: object
          properties:
            slug:
              type: string
            name:
              type: string
    StockRowEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/StockRow'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    StockRowListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/StockRow'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    StockMovement:
      type: object
      required: [id, at, reason, quantity]
      properties:
        id:
          type: integer
        at:
          type: string
          format: date-time
        sku:
          type: [string, 'null']
        product:
          type: [string, 'null']
        reason:
          type: string
          enum: [restock, adjust, order, return]
        quantity:
          type: integer
          description: Signé
        author:
          type: [string, 'null']
        note:
          type: [string, 'null']
    StockMovementListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/StockMovement'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    AdminCustomerSummary:
      type: object
      required: [id, name, phone, orders_count, spent_cents, is_active]
      properties:
        id:
          type: string
          description: ULID public
        name:
          type: string
        phone:
          type: string
        email:
          type: [string, 'null']
        orders_count:
          type: integer
        spent_cents:
          type: integer
          description: Commandes non annulées
        last_order_at:
          type: [string, 'null']
          format: date-time
        is_active:
          type: boolean
        segment:
          type: string
          enum: [vip, new, regular, inactive]
        created_at:
          type: string
          format: date-time
    AdminCustomer:
      allOf:
        - $ref: '#/components/schemas/AdminCustomerSummary'
        - type: object
          properties:
            marketing_opt_in:
              type: boolean
            last_login_at:
              type: [string, 'null']
              format: date-time
            addresses:
              type: array
              items:
                $ref: '#/components/schemas/Address'
            orders:
              type: array
              items:
                $ref: '#/components/schemas/AdminOrderSummary'
            notes:
              type: array
              items:
                type: object
                required: [id, body, created_at]
                properties:
                  id:
                    type: integer
                  body:
                    type: string
                  author:
                    type: [string, 'null']
                  created_at:
                    type: string
                    format: date-time
    AdminCustomerEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/AdminCustomer'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    AdminCustomerListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AdminCustomerSummary'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    Coupon:
      type: object
      required: [id, code, type, value, used_count, is_active]
      properties:
        id:
          type: integer
        code:
          type: string
        type:
          type: string
          enum: [percentage, fixed]
        value:
          type: integer
          description: Pourcentage, ou centimes pour un montant fixe
        max_discount_cents:
          type: [integer, 'null']
        min_subtotal_cents:
          type: integer
        starts_at:
          type: [string, 'null']
          format: date-time
        ends_at:
          type: [string, 'null']
          format: date-time
        max_uses:
          type: [integer, 'null']
        used_count:
          type: integer
        is_active:
          type: boolean
    CouponInput:
      type: object
      required: [code, type, value]
      properties:
        code:
          type: string
          maxLength: 32
        type:
          type: string
          enum: [percentage, fixed]
        value:
          type: integer
          minimum: 1
        max_discount_cents:
          type: [integer, 'null']
        min_subtotal_cents:
          type: integer
          minimum: 0
        starts_at:
          type: [string, 'null']
          format: date
        ends_at:
          type: [string, 'null']
          format: date
        max_uses:
          type: [integer, 'null']
          minimum: 1
        is_active:
          type: boolean
    CouponEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Coupon'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    CouponListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Coupon'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    ShopSettings:
      type: object
      required: [brand, announcement, shipping]
      properties:
        brand:
          type: object
          required: [tagline, whatsapp, email]
          properties:
            tagline:
              type: string
            whatsapp:
              type: string
            email:
              type: string
        announcement:
          type: object
          required: [text, active]
          properties:
            text:
              type: string
            active:
              type: boolean
        shipping:
          type: object
          required: [flat_fee_cents, free_threshold_cents]
          properties:
            flat_fee_cents:
              type: integer
            free_threshold_cents:
              type: integer
    ShopSettingsEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/ShopSettings'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    Page:
      type: object
      required: [id, slug, title, body, is_published]
      properties:
        id:
          type: integer
        slug:
          type: string
        title:
          type: string
        body:
          type: string
        meta_title:
          type: [string, 'null']
        meta_description:
          type: [string, 'null']
        is_published:
          type: boolean
        position:
          type: integer
        updated_at:
          type: string
          format: date-time
    PageInput:
      type: object
      required: [title, body]
      properties:
        title:
          type: string
          maxLength: 160
        slug:
          type: [string, 'null']
          description: Dérivé du titre quand absent
        body:
          type: string
        meta_title:
          type: [string, 'null']
          maxLength: 190
        meta_description:
          type: [string, 'null']
          maxLength: 320
        is_published:
          type: boolean
    PageEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Page'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    PageListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Page'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    AuditLogEntry:
      type: object
      required: [id, action, at]
      properties:
        id:
          type: integer
        action:
          type: string
          examples: ['product.updated']
        subject_type:
          type: [string, 'null']
        subject_label:
          type: [string, 'null']
        author:
          type: [string, 'null']
        ip:
          type: [string, 'null']
        user_agent:
          type: [string, 'null']
        changes:
          type: [object, 'null']
          description: Écart avant/après
        at:
          type: string
          format: date-time
    AuditLogListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AuditLogEntry'
        meta:
          type: object
          required: [current_page, last_page, per_page, total]
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    ContactMessageInput:
      type: object
      required: [name, email, subject, message]
      properties:
        name:
          type: string
          maxLength: 120
        email:
          type: string
          format: email
        phone:
          type: [string, 'null']
          description: Normalisé en `+212…`
        subject:
          type: string
          maxLength: 120
        message:
          type: string
          minLength: 20
          maxLength: 2000
        website:
          type: string
          maxLength: 0
          description: Honeypot, toute valeur non vide fait échouer la validation
    ContactReceiptEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: object
          required: [received]
          properties:
            received:
              type: boolean
              const: true
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    Review:
      type: object
      required: [id, rating, body, author, created_at]
      properties:
        id:
          type: integer
        rating:
          type: integer
          minimum: 1
          maximum: 5
        title:
          type: [string, 'null']
        body:
          type: string
        author:
          type: string
          description: Réduit à « Prénom N. »
        created_at:
          type: [string, 'null']
          format: date-time
        status:
          type: string
          enum: [pending, approved, rejected]
          description: Présent uniquement dans la réponse de création
    ReviewInput:
      type: object
      required: [product_id, rating, body]
      properties:
        product_id:
          type: string
          description: ULID public du produit
        rating:
          type: integer
          minimum: 1
          maximum: 5
        title:
          type: [string, 'null']
          maxLength: 120
        body:
          type: string
          minLength: 10
          maxLength: 1000
    ReviewEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/Review'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    ReviewListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Review'
        meta:
          type: object
          properties:
            average:
              type: [number, 'null']
            count:
              type: integer
            distribution:
              type: object
              properties:
                '5': { type: integer }
                '4': { type: integer }
                '3': { type: integer }
                '2': { type: integer }
                '1': { type: integer }
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
        errors:
          type: array
          maxItems: 0
    AdminMessage:
      type: object
      required: [id, name, email, subject, status, created_at]
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
        phone:
          type: [string, 'null']
        subject:
          type: string
        status:
          type: string
          enum: [new, read, replied, archived]
        excerpt:
          type: string
        body:
          type: string
          description: Présent sur la fiche uniquement
        ip:
          type: [string, 'null']
        user_agent:
          type: [string, 'null']
        customer:
          type: [object, 'null']
          description: Client rattaché si le message a été envoyé connecté
        created_at:
          type: [string, 'null']
          format: date-time
        read_at:
          type: [string, 'null']
          format: date-time
        replied_at:
          type: [string, 'null']
          format: date-time
    AdminMessageEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/AdminMessage'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    AdminMessageListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AdminMessage'
        meta:
          type: object
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
            new_count:
              type: integer
        errors:
          type: array
          maxItems: 0
    AdminReview:
      type: object
      required: [id, rating, body, author, status, created_at]
      properties:
        id:
          type: integer
        rating:
          type: integer
          minimum: 1
          maximum: 5
        title:
          type: [string, 'null']
        body:
          type: string
        author:
          type: string
        status:
          type: string
          enum: [pending, approved, rejected]
        product:
          type: [object, 'null']
          properties:
            slug:
              type: string
            name:
              type: string
        moderator:
          type: [string, 'null']
        moderation_note:
          type: [string, 'null']
        moderated_at:
          type: [string, 'null']
          format: date-time
        created_at:
          type: [string, 'null']
          format: date-time
    AdminReviewEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          $ref: '#/components/schemas/AdminReview'
        meta:
          $ref: '#/components/schemas/Meta'
        errors:
          type: array
          maxItems: 0
    AdminReviewListEnvelope:
      type: object
      required: [data, meta, errors]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AdminReview'
        meta:
          type: object
          properties:
            current_page:
              type: integer
            last_page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
            pending_count:
              type: integer
        errors:
          type: array
          maxItems: 0
```

## À venir

| Phase | Endpoints |
| --- | --- |
| ~~1~~ | ~~`GET /products`, `GET /products/{slug}`, `GET /products/{slug}/related`, `GET /bundles`~~ — livrés |
| ~~2~~ | ~~`GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/{item}`, `POST/DELETE /cart/coupon`, `GET /shipping/cities`, `GET /shipping/quote`, `POST /orders`, `GET /orders/{number}`~~ — livrés |
| ~~3~~ | ~~`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET/PATCH /me`, `GET /me/orders`, `GET /me/orders/{number}`, `GET /me/orders/{number}/invoice`, `GET/POST /me/addresses`, `PATCH/DELETE /me/addresses/{address}`, `GET/POST /me/wishlist`, `DELETE /me/wishlist/{product}`~~ — livrés |
| ~~4~~ | ~~`GET/POST /pages`, `GET /pages/{slug}`, `/admin/login`, `/admin/logout`, `/admin/me`, `/admin/dashboard`, `/admin/orders` (+ statut, bon de livraison, export), `/admin/products` (+ variantes, notes, médias, publication), `/admin/stock` (+ ajustement, import/export, mouvements), `/admin/customers` (+ notes), `/admin/coupons`, `/admin/settings`, `/admin/pages`, `/admin/audit-logs`~~ — livrés |
| ~~5~~ | ~~`POST /contact`, `GET /products/{slug}/reviews`, `POST /me/reviews`, `/admin/messages` (+ statut), `/admin/reviews` (+ modération)~~ — livrés |
| 6 | Scène 3D et animations avancées (aucun endpoint nouveau) |
| 7 | `POST /ai/chat` (budget de tokens plafonné), notifications et SEO |

Chaque ajout met à jour ce fichier et la spécification OpenAPI dans le même commit.
