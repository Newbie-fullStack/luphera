# Runbook d'exploitation

Exploitation de la stack Luphéra : démarrage, opérations courantes, incidents, sauvegardes, déploiement. Les commandes `make` s'exécutent depuis la racine du dépôt.

## 1. Prérequis

- Docker Engine 24+ avec Compose v2, ou Docker Desktop.
- `make` (Linux, macOS, WSL). Sous Windows sans `make`, utiliser directement `docker compose`.
- 4 Go de RAM libres, 10 Go de disque pour les volumes MySQL, Redis, Meilisearch et MinIO.
- Ports : 3306, 6379, 7700, 8000, 9000, 9001, 5173.

## 2. Premier démarrage

```bash
git clone https://github.com/Newbie-fullStack/luphera.git
cd luphera
cp .env.example .env        # facultatif, le compose fournit des valeurs par défaut
make up
make ps                     # tous les services doivent être "running" / "healthy"
curl http://localhost:8000/api/v1/health
```

Attendu : `{"data":{"status":"ok",...}}`. Le storefront répond sur http://localhost:5173, le design system sur `/design-system`.

Le conteneur API copie `.env.example` vers `.env` s'il manque, génère `APP_KEY`, attend MySQL, joue `migrate --force`, puis lance le seed (`SEED_ON_START=true`).

## 3. Carte des services

| Service | Rôle | Dépend de | Données |
| --- | --- | --- | --- |
| `mysql` | Base principale | — | `mysql-data` |
| `redis` | Cache, sessions, queues Horizon | — | `redis-data` |
| `meilisearch` | Index de recherche | — | `meilisearch-data` |
| `minio` | Médias S3-compatibles | — | `minio-data` |
| `minio-init` | Crée le bucket et le rend lisible | `minio` | — |
| `api` | PHP-FPM/`artisan serve` | mysql, redis, minio | code monté |
| `horizon` | Workers de queue | api | code monté |
| `scheduler` | Tâches planifiées | api | code monté |
| `web` | Vite dev server | api | code monté |

## 4. Opérations courantes

```bash
make logs                       # tous les logs
docker compose logs -f api      # un seul service
make restart                    # api, horizon, scheduler
make sh                         # shell dans l'API
make seed                       # rôles, permissions, admin local
make fresh                      # migrate:fresh --seed (destructif)
make test                       # tests API + web
make lint                       # Pint, PHPStan, ESLint, TypeScript
```

Migration en production :

```bash
docker compose exec -T api php artisan migrate --force
docker compose exec -T api php artisan config:cache
docker compose exec -T api php artisan route:cache
docker compose exec -T api php artisan view:cache
```

Après un déploiement, toujours vider les caches si la configuration a changé :

```bash
docker compose exec -T api php artisan optimize:clear
```

## 5. Sauvegardes

Base :

```bash
docker compose exec -T mysql mysqldump -u root -p"$DB_ROOT_PASSWORD" --single-transaction luphera \
  | gzip > backup-$(date +%F-%H%M).sql.gz
```

Restauration :

```bash
gunzip -c backup-2026-11-13-1200.sql.gz \
  | docker compose exec -T mysql mysql -u root -p"$DB_ROOT_PASSWORD" luphera
```

Médias : sauvegarder le volume `minio-data` ou synchroniser le bucket avec `mc mirror`. Les deux sauvegardes doivent être prises au même moment ; une base restaurée sans ses médias produit des images cassées.

Fréquence recommandée : quotidienne, 30 jours de rétention, copie hors du serveur. Aucune sauvegarde automatique n'est encore configurée (phase 7).

## 6. Incidents

### `/health` renvoie 503

1. Lire `checks.database` et `checks.cache` dans la réponse.
2. `docker compose ps` : vérifier l'état de `mysql` et `redis`.
3. `docker compose logs --tail=200 mysql redis`.
4. Redémarrer le service fautif : `docker compose restart mysql`.
5. Si MySQL ne remonte pas, vérifier l'espace disque (`docker system df`) et les permissions du volume.

### L'API répond mais les écritures échouent

- Vérifier `storage/logs/laravel.log` : `docker compose exec api tail -n 200 storage/logs/laravel.log`.
- Erreurs fréquentes : clé `APP_KEY` absente, migrations non jouées, disque MinIO plein, Redis injoignable pour les sessions.

### Les jobs ne partent pas

1. `docker compose ps horizon` puis `docker compose logs --tail=200 horizon`.
2. Vérifier `QUEUE_CONNECTION=redis` et `REDIS_HOST=redis`.
3. Redémarrer Horizon : `docker compose restart horizon`.
4. En local Windows, Horizon ne démarre pas (extensions `pcntl`/`posix` absentes) : utiliser Docker.

### Recherche vide ou en erreur

1. `curl http://localhost:7700/health`.
2. Réindexer : `docker compose exec -T api php artisan scout:import "App\Models\Product"`.
3. Si l'index est corrompu : `php artisan scout:flush "App\Models\Product"` puis réimporter.

### Le storefront affiche une page blanche

1. Ouvrir la console du navigateur et l'onglet réseau.
2. Vérifier `VITE_API_URL` et `VITE_API_PROXY`.
3. Vérifier que l'API répond : `curl http://localhost:8000/api/v1/health`.
4. En développement, relancer Vite après modification de `.env`.

### Fuite de secret

1. Révoquer la clé concernée chez le fournisseur.
2. `php artisan key:generate --force` invalide sessions et cookies : prévenir les utilisateurs connectés.
3. `php artisan config:clear` puis redémarrer `api`, `horizon`, `scheduler`.
4. Consigner l'incident et la date de rotation.

## 7. Déploiement et retour arrière

Procédure cible (phase 7 pour l'automatisation complète) :

1. CI verte sur `main`.
2. Sauvegarde de la base.
3. `docker compose pull` puis `docker compose up -d --build`.
4. `php artisan migrate --force` (migrations additives uniquement).
5. `curl -f https://api.luphera.ma/api/v1/health`.
6. Vérification du storefront et d'une commande de test.

Retour arrière : redéployer l'image précédente, restaurer la sauvegarde si une migration destructive a eu lieu. Aucune migration destructive n'est autorisée sans sauvegarde vérifiée.

## 8. Comptes et accès

- Admin local : `+212600000001` / `password`, créé uniquement en `local` et `testing`.
- En production, créer l'admin manuellement puis changer le mot de passe immédiatement ; ne jamais activer le seeder de démonstration.
- Les secrets vivent dans le gestionnaire de secrets de l'hébergeur, jamais dans Git. `.env.example` ne contient que des valeurs de développement.

## 9. À compléter avant la mise en ligne

- [ ] Hébergeur, nom de domaine, certificats TLS.
- [ ] Sauvegardes automatiques et test de restauration.
- [ ] Supervision externe de `/health` et alertes (Sentry en phase 7).
- [ ] Rotation des clés (APP_KEY, MinIO, Meilisearch, paiement).
- [ ] Textes légaux et coordonnées réelles.
- [ ] Procédure d'astreinte et contacts.
