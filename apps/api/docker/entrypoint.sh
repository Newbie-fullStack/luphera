#!/bin/sh
set -eu

if [ "${APP_ENV:-local}" != "production" ] && [ ! -f .env ]; then
    cp .env.example .env
fi

if [ -z "${APP_KEY:-}" ] && [ -f .env ]; then
    php artisan key:generate --force >/dev/null
fi

if [ "${WAIT_FOR_DB:-true}" = "true" ]; then
    echo "Waiting for the database..."
    until php -r '
        try {
            new PDO(
                "mysql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE"),
                getenv("DB_USERNAME"),
                getenv("DB_PASSWORD")
            );
        } catch (Throwable $e) {
            exit(1);
        }
    '; do
        sleep 2
    done
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

if [ "${SEED_ON_START:-false}" = "true" ]; then
    php artisan db:seed --force
fi

php artisan storage:link >/dev/null 2>&1 || true

exec "$@"
