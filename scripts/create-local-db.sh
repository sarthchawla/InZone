#!/bin/bash

# Local PostgreSQL database setup script
# Creates the 'inzone' database if it doesn't exist
# Note: In devcontainer, the database is automatically initialized - this script is not needed

set -e

# Skip if running in devcontainer (database is auto-initialized)
if [ -n "$REMOTE_CONTAINERS" ] || [ -n "$CODESPACES" ] || [ -f "/.dockerenv" ] && [ -f "/workspaces/.codespaces" ]; then
    echo "Running in devcontainer - database is auto-initialized, skipping..."
    exit 0
fi

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-$(whoami)}"
DB_NAME="${DB_NAME:-inzone}"

echo "Creating database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
echo "Database '$DB_NAME' created successfully"

# Output the DATABASE_URL for reference
DATABASE_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
echo ""
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "You can add this to your .env file if needed"
