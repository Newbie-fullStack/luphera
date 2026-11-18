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
| 31 | CI : installation explicite des bindings natifs Linux (Rolldown, Lightning CSS, Tailwind Oxide) | `npm ci`/`npm install` sautent parfois les dépendances optionnelles de plateforme (npm/cli#4828), ce qui empêche Vitest et le build de démarrer. |
| 32 | Domaine `App\Domain\Catalog` (Enums, Models, Queries) ; contrôleurs fins, `FormRequest` et ressources dédiées | La logique de filtre et de tri vit dans `ProductIndexQuery`, testable seule ; les contrôleurs ne font que valider, interroger et sérialiser. |
| 33 | Recherche phase 1 en SQL indexé (`LIKE` sur nom, famille, tag, descriptions, notes) dans `ProductIndexQuery` | Aucun service externe à installer pour la phase 1 ; Meilisearch/Scout prend le relais en phase 6 sans changer la forme de la réponse. |
| 34 | Pagination par curseur avec tri déterministe (`position,id`, `from_price_cents,id`, `created_at,id`) | Évite les doublons et les sauts d'éléments quand le catalogue change entre deux pages, contrairement à `offset`. |
| 35 | Ressources JSON en classes finales avec `make()` statique plutôt qu'`JsonResource` | Les tableaux typés restent lisibles par PHPStan niveau 6 ; `JsonResource` impose des types `mixed` coûteux à annoter. |
| 36 | Modèles catalogue avec la propriété `$casts` et non la méthode `casts()` | Larastan 3 ne résout pas encore les casts d'enum déclarés par méthode ; la propriété garde l'analyse statique exacte. |
| 37 | Le public ne voit que `stock_status` (`in_stock`, `low_stock`, `out_of_stock`) | Le stock exact est une donnée commerciale ; le front n'en a pas besoin pour afficher la disponibilité. |
| 38 | `products.is_demo` signale le catalogue semé ; le front affiche un avertissement discret | Aucun prix, stock ou description de démonstration ne doit passer pour une affirmation réelle. |
| 39 | `variants_count` exposé dans la fiche résumée | Permet d'afficher « À partir de » uniquement quand plusieurs contenances existent, sans requête supplémentaire. |
| 40 | Filtres de boutique synchronisés dans l'URL (`ligne`, `famille`, `note`, `prix_min`, `prix_max`, `q`, `tri`) | Les liens sont partageables, le retour navigateur restaure l'état, et le front n'invente pas un second état local. |
| 41 | Sélection d'accueil curatée par slug (`noir`, `aurore`, `coffret-duo`) dans le catalogue réel | Le titre « Deux signatures. Un coffret. » doit correspondre aux cartes affichées ; l'ordre éditorial ne dépend pas du tri par défaut. |

## Commerce (phase 2)

| # | Décision | Justification |
| --- | --- | --- |
| 42 | Panier invité identifié par un jeton opaque ULID dans `X-Cart-Token`, renvoyé dans `meta.cart_token` | Aucun compte requis par le brief ; le jeton remplace la session sans exposer d'identifiant interne. |
| 43 | Le jeton et la ville sont conservés en `localStorage` (`luphera.cart.token`, `luphera.cart.city`) | Un rechargement ou un retour plus tard retrouve le même panier ; `GET /cart` n'est appelé que si un jeton existe, donc un visiteur ne crée pas de panier vide. |
| 44 | Tous les montants sont recalculés côté serveur (`PricingService`), jamais envoyés par le client | Un prix ou une remise venant du navigateur est une faille : le total affiché doit être exactement celui qui sera facturé. |
| 45 | Livraison offerte au-dessus de 80 000 centimes, sinon tarif de la ville, sinon tarif forfaitaire | Reprend la règle du design de référence ; le seuil et le forfait vivent en base (`settings`), pas dans le code. |
| 46 | Une ligne est plafonnée à 10 unités et à la quantité en stock | Évite les commandes de revendeur et les erreurs de stock ; le stepper du front reçoit `max_quantity` du serveur. |
| 47 | Coupon `LUPHERA10` semé : 10 %, plafond 20 000 centimes, minimum 50 000, 500 usages, un par commande | Le parcours a besoin d'un code réel pour être testé ; le compteur `used_count` n'est incrémenté que dans la transaction de commande. |
| 48 | Commande numérotée `LPH-YYMMDD-XXXX`, lignes figées (nom, SKU, prix) et adresse en JSON | Un changement de catalogue ne doit jamais réécrire une commande passée ; le numéro reste lisible au téléphone. |
| 49 | `Idempotency-Key` unique et nullable sur `orders`, rejouée avant toute écriture | Un double clic ou un retry réseau renvoie la même commande sans décrémenter deux fois le stock. |
| 50 | Stock décrémenté sous `lockForUpdate` dans la transaction, un `stock_movements` par changement | La survente est impossible même sous concurrence ; l'historique des mouvements rend les écarts auditables. |
| 51 | Transitions de statut explicites (`pending → confirmed → …`) ; `cancelled`, `failed_delivery` et `returned` remettent en stock | Une commande annulée doit rendre les flacons ; les états terminaux refusent toute transition pour ne pas réécrire l'histoire. |
| 52 | Suivi public protégé par `?token=`, `X-Order-Token` ou `?phone=` ; sinon `404` | Le numéro seul permettrait d'énumérer les commandes et de lire les adresses ; `404` ne confirme pas l'existence. |
| 53 | `BusinessRuleException(errorCode, message, fields, status)` rendue dans l'enveloppe d'erreur | Les refus métier (stock, coupon, panier vide) portent un code stable et des champs, sans exception générique en 500. |
| 54 | Le renderer de `BusinessRuleException` est enregistré avant le renderer `Throwable` | Laravel évalue les callbacks dans l'ordre d'enregistrement ; l'ordre inverse aurait transformé les refus métier en 500. |
| 55 | Le schéma Zod du checkout est construit par `createCheckoutSchema(t)` | Aucun message français en dur dans le schéma ; les clés `checkout.errors.*` suivent la même règle i18n que le reste du front. |
| 56 | Le jeton de suivi est gardé en `sessionStorage` (`luphera.order.<numéro>`) | La page de confirmation survit à un rechargement sans redemander le téléphone, et le jeton disparaît à la fermeture de l'onglet. |
| 57 | Le bouton de commande est désactivé pendant l'envoi et la clé d'idempotence est créée par `useState` | Double soumission impossible côté interface ; `useState` évite la lecture de `ref` pendant le rendu que refuse le React Compiler. |
| 58 | `useWatch` au lieu de `form.watch` pour la ville | Le lint React Compiler interdit `watch()` (fonction non mémoïsable) ; `useWatch` garde la synchronisation sans casser la mémoïsation. |
| 59 | `ShippingProgress` reçoit ses libellés et un renderer de reste à payer | Le composant reste sans texte français en dur, donc réutilisable pour l'arabe et le RTL de la phase 7. |
| 60 | `DatabaseSeeder` sans `WithoutModelEvents` ; cache des permissions vidé après leur création | Le trait désactivait le hook `creating` de `HasPublicId` (échec `users.public_id`) ; `syncPermissions` résout les noms via le cache du registrar. |

## Comptes (phase 3)

| # | Décision | Justification |
| --- | --- | --- |
| 61 | Authentification par session Sanctum (`statefulApi()`, cookie `httpOnly`), aucun token Bearer délivré au navigateur | Le brief impose un compte client sans application mobile ; le cookie évite de stocker un secret lisible en JavaScript. |
| 62 | Un seul champ `identifier` à la connexion ; un `@` choisit l'e-mail, sinon le téléphone normalisé `+212…` | Le client se souvient d'un numéro ou d'un e-mail, pas d'un type de compte ; une seule route évite deux formulaires. |
| 63 | Les commandes invité sont rattachées **uniquement à l'inscription**, par téléphone normalisé (`OrderClaimService`, `user_id` + `claimed_at`) | Réclamer à la connexion permettrait de prendre les commandes d'autrui en connaissant juste un numéro. |
| 64 | `PATCH /me` n'accepte pas `phone` ; le changement exige une vérification SMS `[à compléter]` | Déplacer un compte vers un numéro non prouvé ouvrirait une prise de contrôle ; l'interface l'explique au lieu d'échouer en silence. |
| 65 | Toute ressource d'un autre client répond `404`, jamais `403` | Un `403` confirmerait l'existence de la commande ou de l'adresse devinée. |
| 66 | Invariant d'une seule adresse par défaut, porté par `AddressBook` : première adresse par défaut, défaut explicite rétrograde les autres, suppression promeut la plus récente | Le checkout a besoin d'une adresse par défaut stable ; la règle vit au même endroit que les écritures. |
| 67 | Facture PDF (`barryvdh/laravel-dompdf`) réservée aux commandes `delivered` et à leur propriétaire, rendu texte seul | Une commande en cours peut encore changer ; le PDF local ne dépend pas de `gd`, absent du PHP du poste. |
| 68 | CSRF récupéré paresseusement une fois par chargement de page, puis renvoyé en `X-XSRF-TOKEN` ; Vite proxifie `/api` et `/sanctum` | Sanctum exige le cookie et l'en-tête sur chaque mutation ; le proxy garde le navigateur sur une seule origine en développement. |
| 69 | `fetchMe` traduit `401` en `null` (visiteur), sans message d'erreur | Un visiteur n'est pas une panne ; seul le navigateur journalise la ressource 401, filtrée dans les tests e2e. |
| 70 | `SANCTUM_STATEFUL_DOMAINS` inclut `localhost:5180` en plus de 5173/8000 | Sans le port réel du serveur Vite, les cookies de session ne sont pas posés et l'authentification échoue silencieusement. |
| 71 | Favoris pilotés depuis la fiche produit (`Ajouter aux favoris` / `Retirer des favoris`) ; visiteur redirigé vers `/connexion?redirect=/produit/{slug}` | Le geste naturel est sur le produit, pas dans le compte ; la redirection ramène le client là où il était. |
| 72 | Schémas Zod d'authentification partagés dans `features/auth/schemas.ts`, erreurs serveur mappées par `lib/forms.ts` | Les quatre formulaires partagent les mêmes règles ; le mapping évite de dupliquer la lecture de `errors.fields`. |
| 73 | Le checkout préremplit l'adresse par défaut une seule fois, sans écraser une saisie en cours ; les totaux serveur restent seuls maîtres | Un client qui corrige son adresse ne doit pas la voir réinitialisée ; un total venu du front serait une faille. |
| 74 | Mot de passe oublié : même réponse que l'adresse existe ou non | Empêche d'énumérer les comptes par l'e-mail. |
| 75 | Captures de compte rejouées par `scripts/screens.mjs` (`SCREEN_FLOW=account`) avec un client jetable | Les écrans de compte exigent une session réelle ; des données générées gardent les captures reproductibles. |
| 76 | `testTimeout` Vitest porté à 15 s | La suite complète exécutée en parallèle dépassait le délai par défaut sur les tests de formulaire, sans échec réel. |

## Écarts assumés

| Écart | Raison | Suite |
| --- | --- | --- |
| `make up` non exécuté sur le poste de développement | Docker n'y est pas installé ; le compose est validé par `docker compose config` en CI. | À valider sur une machine Docker avant la phase 4. |
| Horizon non démarrable sous Windows | Extensions `pcntl` et `posix` absentes du PHP local. | Fonctionne dans l'image Docker. |
| Couverture web 59 % au global, 80–90 % sur le panier et la commande | Les pages éditoriales et les clients API restent couverts par Playwright ; l'objectif de 80 % s'applique aux domaines panier et commande, désormais atteint. | Compléter les tests de pages en phase 5 (contenus). |
| Textes légaux, photos Femme, coordonnées | Non fournis par le client. | Marqués `[à compléter]`, jamais présentés comme définitifs. |
