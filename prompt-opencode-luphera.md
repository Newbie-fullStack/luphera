# Prompt OpenCode – Plateforme Luphéra (Laravel + React + MySQL)

## 1. Rôle et objectif

Copie tout ce document dans OpenCode, à la racine d'un dépôt vide. Place aussi le fichier `luphera.html` (le site de référence) dans `reference/`.

**Rôle.** Tu es un architecte et développeur full stack senior (Laravel, React, UX de luxe, e-commerce). Tu construis la plateforme complète de la marque de parfums **Luphéra** : vitrine 3D, boutique, espace client, back-office et fonctions intelligentes.

**Objectif.** Une plateforme e-commerce de luxe, prête pour la production, pour le Maroc. Elle doit donner l'impression d'une maison de haute parfumerie : sobre, lente, précise, jamais criarde.

**Façon de travailler.**

- Avance par phases (section 10). À la fin de chaque phase : tests verts, `README` à jour, commit propre, puis résumé de 10 lignes maximum.
- Ne demande pas de confirmation pour les choix techniques courants. Décide, note le choix dans `docs/DECISIONS.md` avec une ligne de justification.
- Ne demande que ce qui bloque vraiment : clés API, textes légaux, photos manquantes.
- Code, noms de tables, routes et commentaires en anglais. Textes visibles par l'utilisateur en français (arabe prévu en phase 7).
- Aucune donnée inventée présentée comme réelle : prix, avis, stock et textes légaux fictifs sont marqués `seed` ou `[à compléter]`.
- Pas de dépendance inutile. Chaque paquet ajouté est justifié dans `docs/DECISIONS.md`.

## 2. Marque et design de référence

**Luphéra** est une nouvelle marque marocaine d'eaux de parfum pour homme et pour femme. Identité noir et or, emblème : un loup dans un monogramme L, avec un flacon. Slogan de travail : « Avancer sans bruit, laisser une trace d'or. »

**Produits de départ (données `seed`).**

| Produit | Ligne | Famille | Prix 30 / 50 / 100 ml (MAD) |
| --- | --- | --- | --- |
| Luphéra Noir | Homme | Boisé cuiré | 450 / 690 / 990 |
| Luphéra Ambre | Homme | Ambré épicé | 450 / 690 / 990 |
| Luphéra Aurore | Femme | Floral vanillé | 450 / 690 / 990 |
| Luphéra Soie | Femme | Poudré musqué | 450 / 690 / 990 |
| Coffret Duo | Coffret | Noir + Aurore, 2 × 50 ml | 1 190 |
| Coffret Découverte | Coffret | 4 × 10 ml | 390 |

**Référence visuelle.** `reference/luphera.html` est la base à reproduire et à dépasser. Relis son CSS, son JavaScript et ses commentaires avant de coder. Reprends tels quels :

- Les jetons de couleur : `--nuit #070605`, `--obsidienne #100d0a`, `--charbon #1b1712`, `--or #c9a24b`, `--or-clair #f0d589`, `--or-profond #8a6a26`, `--ivoire #efe6d2`, `--texte #d3cab6`, `--brume #9b9283`, `--rose #e3b7a0` (ligne Femme), `--err #e2907f`.
- Les polices : Marcellus pour les titres, Jost pour le texte.
- La courbe d'animation `cubic-bezier(.22,.61,.12,1)`, lente et douce.
- La scène 3D : flacon en verre avec transmission, transformation en particules entre la ligne Homme et la ligne Femme, poussière d'or, flacon ancré à son cadre sur la fiche produit, rotation à la souris.
- Le parcours : accueil, boutique, fiche produit, tiroir panier, commande, confirmation, pages de marque.
- La page `#systeme` : le design system vivant. Reconstruis-la en Storybook ou en page `/design-system`.

**Direction.** Luxe silencieux : beaucoup d'espace noir, filets d'or fins de 1 px, titres en capitales espacées, aucun dégradé criard, aucune ombre lourde. Le mouvement sert l'histoire du parfum et n'est jamais décoratif. Respecte `prefers-reduced-motion` : sans animation, le site reste complet.

**Photos.** Les flacons Ambre, Aurore et Soie du fichier de référence sont des variantes teintées de la photo du flacon Noir. Prévois un champ image par produit, des visuels de remplacement et une pipeline d'optimisation (WebP/AVIF, tailles responsives).

## 3. Stack et architecture

**Choix de base : MySQL 8.** Une boutique manipule des commandes, du stock et des paiements, qui exigent des transactions et des relations strictes. Une base NoSQL n'apporte rien ici. MongoDB reste inutile, sauf si tu stockes un jour des journaux d'événements.

| Couche | Choix |
| --- | --- |
| API | Laravel 12, PHP 8.3, API REST JSON versionnée `/api/v1` |
| Authentification | Laravel Sanctum (SPA, cookies httpOnly), rôles et permissions avec `spatie/laravel-permission` |
| Base de données | MySQL 8, migrations, seeders et factories complets |
| Cache, files, sessions | Redis, Laravel Horizon pour les files d'attente |
| Recherche | Meilisearch via Laravel Scout (tolérance aux fautes, filtres, synonymes) |
| Front | React 19, TypeScript strict, Vite, React Router, TanStack Query |
| Style | Tailwind CSS avec les jetons du design system |
| 3D | Three.js via `@react-three/fiber` et `drei`, chargé à la demande |
| Animation | GSAP ScrollTrigger ou Framer Motion, au choix, une seule bibliothèque |
| Formulaires | React Hook Form et Zod |
| Fichiers | Stockage compatible S3 (MinIO en local), images servies en WebP/AVIF |
| Tests | Pest (API), Vitest et Testing Library (front), Playwright (parcours) |
| Outils | Docker Compose, Laravel Pint, ESLint, Prettier, PHPStan niveau 6, GitHub Actions |

**Structure du dépôt (monorepo).**

```
luphera/
  apps/
    api/            Laravel (app/Domain/*, app/Http, database, tests)
    web/            React (src/app, features, components, three, lib)
  reference/        luphera.html (design de référence)
  docs/             DECISIONS.md, API.md (OpenAPI), RUNBOOK.md
  docker-compose.yml
  Makefile          make up, make test, make seed, make lint
  README.md
```

**Principes.**

- Laravel organisé par domaines : `Catalog`, `Cart`, `Orders`, `Customers`, `Shipping`, `Marketing`, `AI`. Chaque domaine a ses modèles, actions et politiques.
- Les contrôleurs restent fins. La logique métier vit dans des classes `Action` testables. Les entrées passent par des `FormRequest`, les sorties par des `Resource`.
- Les montants sont stockés en centimes (entiers), jamais en flottants. Devise unique : MAD.
- Le front consomme uniquement l'API. Les types TypeScript sont générés à partir de la spécification OpenAPI.
- Configuration par variables d'environnement. Fournis `.env.example` complet et documente chaque variable.

## 4. Modèle de données MySQL

Crée les migrations avec clés étrangères, index sur toutes les colonnes filtrées, `softDeletes` sur les entités métier, `created_at` et `updated_at` partout. Identifiants publics en ULID, identifiants internes en entiers.

| Table | Contenu essentiel |
| --- | --- |
| `users` | nom, téléphone unique, e-mail optionnel, mot de passe, rôle (`customer`, `admin`, `manager`, `support`) |
| `addresses` | user, ville, quartier, adresse, repère, défaut |
| `products` | slug, nom, ligne (`homme`, `femme`, `coffret`), famille olfactive, description, statut (`draft`, `active`, `archived`), tag, intensité, tenue, sillage, saison, occasion, SEO |
| `product_variants` | produit, contenance (ml), SKU, prix en centimes, prix barré, stock, seuil d'alerte |
| `product_notes` | produit, niveau (`top`, `heart`, `base`), note, ordre |
| `product_media` | produit, type (`photo`, `model3d`), URL, texte alternatif, ordre |
| `bundles` / `bundle_items` | contenu des coffrets (variante, quantité) |
| `carts` / `cart_items` | panier invité (jeton) ou connecté, fusion à la connexion |
| `orders` | numéro `LPH-AAMMJJ-XXXX`, client, adresse figée en JSON, statut, sous-total, remise, livraison, total, mode de paiement, note |
| `order_items` | variante, nom et prix figés à l'achat, quantité |
| `order_events` | historique : statut, auteur, commentaire, date |
| `payments` | commande, mode (`cod`, plus tard `card`), statut, montant, référence |
| `shipments` | commande, transporteur, suivi, statut, dates |
| `coupons` | code, type (pourcentage ou montant), plafond, minimum, dates, usages max |
| `reviews` | produit, client, note, texte, statut de modération, achat vérifié |
| `wishlists` | client, produit |
| `stock_movements` | variante, quantité, motif (`order`, `return`, `adjust`, `restock`), auteur |
| `cities` | nom, frais de livraison, délai, actif |
| `settings` | paramètres de la boutique (seuil de livraison offerte, contacts, textes) |
| `pages` | contenu éditable : histoire, livraison, mentions, FAQ |
| `newsletter_subscribers` | e-mail, consentement, date |
| `messages` | formulaire de contact, statut, réponse |
| `ai_conversations` / `ai_messages` | historique du conseiller, avec jeton de session |
| `product_embeddings` | produit, vecteur, modèle (voir section 8) |

**Règles d'intégrité.**

- Une commande fige les prix et le nom du produit : modifier le catalogue ne change jamais une commande passée.
- Le stock se décrémente dans la même transaction que la création de la commande, avec verrou (`lockForUpdate`). Impossible de vendre plus que le stock.
- Chaque changement de stock écrit une ligne dans `stock_movements`.
- Chaque changement de statut de commande écrit une ligne dans `order_events`.

## 5. API REST et règles métier

Préfixe `/api/v1`. Réponses JSON cohérentes (`data`, `meta`, `errors`), pagination par curseur sur les listes, codes HTTP exacts, limitation de débit sur les routes sensibles. Documentée en OpenAPI dans `docs/API.md`.

| Zone | Routes principales |
| --- | --- |
| Catalogue | `GET /products` (filtres ligne, famille, prix, notes, recherche, tri), `GET /products/{slug}`, `GET /products/{slug}/related`, `GET /bundles` |
| Panier | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `POST /cart/coupon`, `DELETE /cart/coupon` |
| Commande | `GET /shipping/quote?city=`, `POST /orders` (idempotent via en-tête `Idempotency-Key`), `GET /orders/{number}` (jeton de suivi pour les invités) |
| Compte | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `GET/POST/PATCH/DELETE /me/addresses`, `GET /me/orders`, `GET /me/wishlist` |
| Contenu | `GET /pages/{slug}`, `POST /contact`, `POST /newsletter`, `GET /settings/public` |
| Avis | `GET /products/{slug}/reviews`, `POST /products/{slug}/reviews` (achat vérifié requis) |
| Intelligence | `POST /ai/advisor`, `POST /ai/quiz`, `GET /search?q=` (voir section 8) |
| Admin | `/admin/*` : produits, variantes, stock, commandes, clients, coupons, avis, pages, paramètres, statistiques |

**Règles métier à implémenter côté serveur** (le front n'est jamais la source de vérité) :

- Livraison : 35 MAD par défaut, offerte dès 800 MAD après remise. Frais par ville modifiables dans `cities`, seuil modifiable dans `settings`.
- Coupons : un seul par commande, validité par dates, minimum d'achat, nombre d'usages, plafond de remise. Code d'essai `LUPHERA10` (10 %).
- Téléphone marocain validé et normalisé en `+212XXXXXXXXX` (regex `^(\+212|00212|0)[5-7]\d{8}$`).
- Statuts de commande : `pending` → `confirmed` (après appel client) → `preparing` → `shipped` → `delivered`, plus `cancelled`, `returned`, `failed_delivery`. Seules les transitions valides sont acceptées, chacune déclenche un événement et une notification.
- Annulation : possible avant l'expédition, le stock est alors restitué.
- Retour : sous 7 jours pour un produit scellé.
- Prix recalculés à chaque lecture du panier à partir de la base. Le client ne fournit jamais un prix.
- Paiement à la livraison au départ. La table `payments` et une interface `PaymentGateway` préparent l'arrivée de CMI ou Stripe sans réécriture.

## 6. Vitrine React et espace client

Reproduis le parcours du fichier de référence, en production : routes réelles (`/`, `/boutique`, `/produit/:slug`, `/commande`, `/commande/confirmation/:number`, `/compte`, `/histoire`, `/livraison`, `/contact`, `/mentions-legales`), pas de `#hash`.

**Accueil.** Héro avec flacon 3D, scène de transformation Homme vers Femme pilotée par le défilement, notes olfactives, sélection, engagements. La scène 3D est un composant isolé, chargé en `lazy`, avec un repli en photo si WebGL est absent ou si l'appareil est faible.

**Boutique.** Filtres (ligne, famille, notes, prix), recherche instantanée, tri, état vide soigné, URL qui reflète les filtres.

**Fiche produit.** Flacon 3D rotatif ancré à son cadre, onglet Photo, choix de contenance, quantité, pyramide olfactive, jauges d'intensité, tenue et sillage, avis vérifiés, produits similaires, barre d'achat fixe sur mobile, données structurées `schema.org/Product`.

**Panier et commande.**

- Tiroir panier avec barre de livraison offerte, code promo, persistance (invité puis fusion à la connexion).
- Commande en une page, sans compte obligatoire : nom, téléphone, ville (liste issue de `cities`), adresse, note, paiement à la livraison, acceptation des CGV.
- Validation en direct, erreurs sous chaque champ, focus sur la première erreur, double envoi impossible.
- Confirmation avec numéro de commande, étapes de suivi et récapitulatif. Suivi public par numéro de commande et téléphone.

**Espace client.** Connexion par téléphone ou e-mail et mot de passe, réinitialisation, historique et suivi des commandes, carnet d'adresses, favoris, profil. Facture PDF téléchargeable par commande livrée.

**Qualité d'interface.**

- Mobile d'abord, testé à 360 px, 400 px, 768 px, 1440 px.
- Accessible : navigation clavier complète, focus visible, `aria-live` sur les mises à jour du panier, contrastes AA, piège de focus dans le tiroir.
- Performance : LCP sous 2,5 s sur 4G, la 3D ne bloque jamais le premier affichage, images dimensionnées, polices préchargées.
- SEO : balises `title` et `description` par page, `sitemap.xml`, `robots.txt`, URLs canoniques, Open Graph soigné, rendu des pages clés accessible aux robots (prérendu ou SSR léger pour accueil, boutique et fiches).

## 7. Back-office administrateur

Application React séparée sous `/admin`, même design system, plus dense et plus sobre. Accès par rôle : `admin` (tout), `manager` (catalogue, commandes), `support` (commandes et messages, lecture seule sur le reste). Chaque action sensible est journalisée (qui, quoi, quand, avant et après).

**Tableau de bord.** Chiffre d'affaires, commandes du jour, panier moyen, taux de confirmation, produits à stock bas, meilleures ventes, ventes par ville, courbe sur 30 jours. Les données viennent de requêtes agrégées en cache.

**Commandes.** File de travail en priorité : « à confirmer par téléphone ». Bouton d'appel et lien WhatsApp pré-rempli, changement de statut en un clic avec commentaire, impression du bon de livraison et de l'étiquette, export CSV, filtres par statut, ville, date, montant.

**Catalogue.** Création et édition des produits, variantes, notes, médias (envoi et réordonnancement par glisser-déposer), coffrets, brouillon et publication, aperçu de la fiche avant mise en ligne.

**Stock.** Vue par variante, ajustement avec motif, historique des mouvements, alerte sous le seuil par e-mail ou notification, import et export CSV.

**Clients.** Fiche avec historique, total dépensé, adresses, notes internes. Segments (nouveaux, fidèles, inactifs) pour le marketing.

**Marketing.** Coupons, bannière d'annonce, abonnés newsletter (export), relances de paniers abandonnés.

**Contenu et réglages.** Édition des pages (histoire, livraison, FAQ, mentions), villes et frais de livraison, seuil de livraison offerte, coordonnées de la marque, modération des avis, lecture des messages de contact.

**Livraison.** Prépare l'intégration d'un transporteur marocain derrière une interface `ShippingProvider` : création d'expédition, numéro de suivi, mise à jour du statut par webhook. Fournis une implémentation manuelle d'abord (saisie du suivi à la main).

## 8. Fonctions intelligentes

L'IA sert le client et l'équipe, jamais de gadget. Chaque fonction a un repli sans IA et une limite de coût. Tous les appels passent par une interface `LlmClient` (implémentations Anthropic et fausse pour les tests). La clé vient de `.env`, jamais du front. Aucune donnée personnelle (nom, téléphone, adresse) n'est envoyée au modèle.

1. **Conseiller olfactif.** Un chat dans la boutique qui recommande un parfum selon l'occasion, la saison, les goûts et le budget. Il répond uniquement à partir du catalogue réel (appel d'outils vers `GET /products`), cite les produits avec lien et bouton d'ajout au panier, et refuse poliment tout ce qui sort du parfum. Ton chaleureux, court, vouvoiement.
2. **Quiz olfactif.** Cinq questions visuelles (moment, ambiance, matières aimées, intensité, budget) qui donnent un top 3 expliqué. Le score est calculé par règles sur les notes et les familles ; le modèle ne fait que rédiger l'explication.
3. **Recherche sémantique.** Meilisearch pour la recherche classique, plus des embeddings des descriptions et des notes (`product_embeddings`) pour comprendre « un parfum chaud pour l'hiver » ou « frais pour le bureau ».
4. **Recommandations.** « Vous aimerez aussi » calculé sur la proximité des notes et sur les achats groupés. Pas d'apprentissage lourd au départ.
5. **Rédaction assistée (admin).** Génère la description, le texte SEO et les notes suggérées d'un produit à partir de quelques mots. Toujours proposé en brouillon, jamais publié sans validation humaine.
6. **Score de risque des commandes.** Règles transparentes (téléphone déjà refusé, adresse incomplète, grosse commande d'un nouveau client, retours précédents). Affiché dans la file « à confirmer » avec les raisons. Il aide l'opérateur, il ne bloque rien seul.
7. **Prévision de stock.** Estimation du nombre de jours restants par variante à partir des ventes récentes, avec alerte de réapprovisionnement.
8. **Assistant support (admin).** Propose une réponse aux messages de contact en français, que l'opérateur relit et envoie.
9. **Relance intelligente.** Panier abandonné : message WhatsApp ou e-mail préparé après 24 h, jamais plus de deux relances, désinscription respectée.

**Garde-fous.**

- Limitation de débit par session et par IP sur `/ai/*`, plafond quotidien de jetons configurable.
- Journalisation des conversations (sans données personnelles) pour améliorer les réponses.
- Test automatisé : le conseiller ne recommande jamais un produit absent du catalogue ni un prix inventé.
- Cache des réponses fréquentes pour limiter le coût.

## 9. Maroc, sécurité, performance et tests

**Spécificités Maroc.**

- Paiement à la livraison par défaut, avec confirmation téléphonique avant expédition. Prix en MAD, format `1 980 MAD`, TTC.
- Téléphone au format marocain, ville choisie dans une liste (Casablanca, Rabat, Fès, Meknès, Tanger, Marrakech, Agadir, Ifrane, Azrou, Oujda, Tétouan, Kénitra, Salé et autres).
- WhatsApp comme canal principal : bouton de contact, message pré-rempli pour confirmer une commande, notification de changement de statut (derrière une interface `Notifier`, avec une implémentation e-mail en attendant).
- Prévoir l'arabe et le RTL en phase 7 : textes dans des fichiers de traduction dès le début (`react-i18next`), jamais en dur dans les composants.
- Mentions légales, CGV et politique de confidentialité : gabarits `[à compléter]` à faire valider (loi 09-08 sur la protection des données, déclaration CNDP).

**Sécurité.**

- Mots de passe hachés (Argon2 ou bcrypt), cookies `httpOnly`, `Secure`, `SameSite`, protection CSRF, CORS limité au domaine du front.
- Validation stricte de toutes les entrées, protection contre l'injection SQL (Eloquent, pas de SQL concaténé), XSS (pas de HTML brut), envoi de fichiers limité par type et taille.
- Limitation de débit sur la connexion, la commande, le contact, la newsletter et `/ai/*`. Champ piège anti-robot et option Cloudflare Turnstile sur les formulaires publics.
- Politiques d'autorisation Laravel sur chaque ressource : un client ne lit jamais la commande d'un autre.
- En-têtes de sécurité (CSP, HSTS, X-Content-Type-Options), journaux sans données sensibles, sauvegardes MySQL quotidiennes documentées dans `RUNBOOK.md`.
- `composer audit` et `npm audit` dans la CI.

**Performance.** Index MySQL vérifiés avec `EXPLAIN`, pas de requête N+1 (test automatique avec `preventLazyLoading`), cache Redis du catalogue invalidé à la modification, images responsives, code découpé par route, 3D chargée à la demande.

**Tests et qualité.**

- Pest : chaque action métier (prix, remise, livraison, stock, transitions de statut, coupons) et chaque route, y compris les cas d'erreur et de droits.
- Vitest : composants clés (panier, formulaire de commande, filtres).
- Playwright : parcours complet visiteur → fiche → panier → commande → confirmation, à 360 px et à 1440 px, plus un parcours admin (confirmer et expédier une commande).
- Couverture minimale de 80 % sur le domaine `Orders` et `Cart`.
- CI GitHub Actions : lint, analyse statique, tests, build. Rien ne passe sur `main` si la CI est rouge.
- Observabilité : Sentry (ou équivalent) côté API et front, journaux structurés, endpoint `/health`.

## 10. Plan par phases et critères d'acceptation

Commence maintenant par la phase 0. Ne passe à la phase suivante que si le critère de sortie est atteint.

| Phase | Contenu | Critère de sortie |
| --- | --- | --- |
| 0. Fondations | Monorepo, Docker Compose (MySQL, Redis, Meilisearch, MinIO), Laravel et React installés, CI, design system en composants, `docs/DECISIONS.md` | `make up` démarre tout, la CI est verte, `/design-system` affiche les composants |
| 1. Catalogue | Migrations, seeders (6 produits), API catalogue, boutique, fiche produit, recherche | La boutique et les fiches affichent les données de la base, filtres et recherche fonctionnent |
| 2. Panier et commande | Panier serveur, coupons, livraison par ville, commande idempotente, stock transactionnel, confirmation, suivi | Parcours Playwright complet vert, impossible de vendre plus que le stock, totaux identiques côté serveur |
| 3. Comptes | Inscription, connexion, espace client, adresses, favoris, factures PDF | Un client voit uniquement ses commandes, tests de droits verts |
| 4. Back-office | Tableau de bord, commandes, catalogue, stock, clients, coupons, contenu, réglages, journal d'audit | Un `support` ne modifie pas le catalogue, une commande est confirmée et expédiée depuis l'admin |
| 5. Expérience 3D | Accueil animé, transformation au défilement, flacon 3D des fiches, repli photo, budgets de performance | LCP sous 2,5 s sur 4G simulée, `prefers-reduced-motion` respecté, repli testé sans WebGL |
| 6. Intelligence | Conseiller, quiz, recherche sémantique, recommandations, rédaction assistée, score de risque, prévision de stock, relances | Test : aucune recommandation hors catalogue, plafonds de coût actifs, repli sans IA fonctionnel |
| 7. Mise en production | Arabe et RTL, notifications WhatsApp, transporteur, SEO, sauvegardes, supervision, guide de déploiement | `RUNBOOK.md` complet, audit Lighthouse supérieur à 90 sur accueil, boutique et fiche |

**Définition de « terminé » pour chaque phase.**

- Les tests de la phase passent et la CI est verte.
- Le parcours a été vérifié dans un navigateur réel sur ordinateur et sur mobile (captures jointes dans `docs/screens/`).
- Aucune erreur dans la console, aucun avertissement d'accessibilité critique.
- `README.md` et `docs/API.md` à jour. Un commit par fonctionnalité, message clair.

**Livrables finaux.** Dépôt complet, `docker compose up` fonctionnel avec données de démonstration, compte admin de test documenté, liste des points à fournir par le client (photos du flacon Femme, textes légaux, liste INCI, coordonnées réelles, clés API, choix du transporteur et du moyen de paiement en ligne).

**Premier message attendu de ta part :** le plan détaillé de la phase 0 en 10 lignes, puis tu l'exécutes.
