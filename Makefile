SHELL := /bin/sh
COMPOSE := docker compose
API := $(COMPOSE) exec -T api

.DEFAULT_GOAL := help

.PHONY: help up down build restart logs ps sh seed fresh test test-api test-web lint lint-api lint-web build-web screens

help: ## Show the available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Start the whole stack (MySQL, Redis, Meilisearch, MinIO, API, Horizon, scheduler, web)
	$(COMPOSE) up -d --build
	@echo "Storefront  http://localhost:5173"
	@echo "API         http://localhost:8000/api/v1"
	@echo "Meilisearch http://localhost:7700"
	@echo "MinIO       http://localhost:9001"

down: ## Stop the stack, keep the volumes
	$(COMPOSE) down

build: ## Build the images without starting them
	$(COMPOSE) build

restart: ## Restart the API and the workers
	$(COMPOSE) restart api horizon scheduler

logs: ## Follow the logs of every service
	$(COMPOSE) logs -f --tail=120

ps: ## Show the service status
	$(COMPOSE) ps

sh: ## Open a shell inside the API container
	$(COMPOSE) exec api sh

seed: ## Run the database seeders (roles, demo catalogue)
	$(API) php artisan db:seed --force

fresh: ## Drop and rebuild the database, then seed it
	$(API) php artisan migrate:fresh --seed --force

test: test-api test-web ## Run the whole test suite

test-api: ## Run the API test suite
	$(API) php artisan test

test-web: ## Run the web unit tests
	$(COMPOSE) exec -T web npm run test:run

lint: lint-api lint-web ## Run every linter and static analysis

lint-api: ## Run Pint and PHPStan
	$(API) vendor/bin/pint --test
	$(API) vendor/bin/phpstan analyse --memory-limit=1G

lint-web: ## Run ESLint and the TypeScript compiler
	$(COMPOSE) exec -T web npm run lint
	$(COMPOSE) exec -T web npm run typecheck

build-web: ## Build the production storefront bundle
	$(COMPOSE) exec -T web npm run build

screens: ## Regenerate docs/screens from the running preview server
	cd apps/web && node scripts/screens.mjs
