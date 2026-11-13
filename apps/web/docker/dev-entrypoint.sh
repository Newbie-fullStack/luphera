#!/bin/sh
set -eu

# Install the workspace dependencies, then the platform-specific binaries that
# npm may skip on Linux (npm/cli#4828). Alpine uses the musl variants.
npm install --include=optional --no-fund --no-audit

ROLLDOWN=$(node -p "require('./package-lock.json').packages['node_modules/rolldown'].version")
LIGHTNING=$(node -p "require('./package-lock.json').packages['node_modules/lightningcss'].version")
OXIDE=$(node -p "require('./package-lock.json').packages['node_modules/@tailwindcss/oxide'].version")

npm install --no-save --no-fund --no-audit \
  "@rolldown/binding-linux-x64-musl@$ROLLDOWN" \
  "lightningcss-linux-x64-musl@$LIGHTNING" \
  "@tailwindcss/oxide-linux-x64-musl@$OXIDE"

exec npm run dev -- --host 0.0.0.0 --port 5173
