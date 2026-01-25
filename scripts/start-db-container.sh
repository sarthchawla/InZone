#!/bin/bash

# Start PostgreSQL in Docker container for local development
# Note: In devcontainer, the database is automatically initialized - this script is not needed

set -e

# Skip if running in devcontainer (database is auto-initialized)
if [ -n "$REMOTE_CONTAINERS" ] || [ -n "$CODESPACES" ] || [ -f "/.dockerenv" ] && [ -f "/workspaces/.codespaces" ]; then
    echo "Running in devcontainer - database is auto-initialized, skipping..."
    exit 0
fi

CONTAINER_NAME="inzone-postgres"
DB_NAME="${DB_NAME:-inzone}"
DB_USER="${DB_USER:-$(whoami)}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_VERSION="${POSTGRES_VERSION:-16}"

echo "Starting PostgreSQL container..."

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "Container '$CONTAINER_NAME' is already running"
    else
        echo "Starting existing container '$CONTAINER_NAME'..."
        docker start "$CONTAINER_NAME"
    fi
else
    echo "Creating new PostgreSQL container..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASSWORD" \
        -e POSTGRES_DB="$DB_NAME" \
        -p "${DB_PORT}:5432" \
        -v "${CONTAINER_NAME}-data:/var/lib/postgresql/data" \
        "postgres:${POSTGRES_VERSION}"

    echo "Waiting for PostgreSQL to be ready..."
    sleep 3
fi

# Wait for PostgreSQL to be ready
echo "Checking PostgreSQL connection..."
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Error: PostgreSQL failed to start"
        exit 1
    fi
    sleep 1
done

# Output connection info
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public"
echo ""
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Port: $DB_PORT"
echo ""
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "To stop the container: docker stop $CONTAINER_NAME"
echo "To remove the container: docker rm $CONTAINER_NAME"
