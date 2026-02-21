#!/usr/bin/env bash
# Production Database Migration Script for Neon
#
# Usage:
#   DIRECT_URL="postgresql://..." ./scripts/migrate-production.sh
#
# Migrations require a direct (non-pooled) connection to Neon.
# The pooled connection (DATABASE_URL) is for runtime queries only.
#
# Options:
#   DIRECT_URL  (required) Direct (non-pooled) Neon connection string
#   SEED=true   (optional) Run database seed after migration

set -euo pipefail

if [ -z "${DIRECT_URL:-}" ]; then
  echo "Error: DIRECT_URL environment variable is required"
  echo "Get it from Neon dashboard -> Connection Details -> Direct connection"
  exit 1
fi

export DATABASE_URL="$DIRECT_URL"

echo "Running Prisma migrations..."
cd "$(dirname "$0")/../apps/api"
pnpm prisma migrate deploy

echo "Migrations complete!"

# Optional: Run seed
if [ "${SEED:-}" = "true" ]; then
  echo "Running seed..."
  pnpm prisma db seed
  echo "Seed complete!"
fi
