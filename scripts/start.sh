#!/bin/bash

# InZone - Full Stack Startup Script
# This script sets up the database and starts the entire application
# Works in both local development and devcontainer environments

set -e

# Get the project root directory (parent of scripts folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🚀 Starting InZone..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect if running in devcontainer
IN_DEVCONTAINER=false
if [ -n "$REMOTE_CONTAINERS" ] || [ -n "$CODESPACES" ] || [ -f "/.dockerenv" ]; then
    IN_DEVCONTAINER=true
    echo -e "${GREEN}✓ Detected devcontainer environment${NC}"
fi

# Database configuration
if [ "$IN_DEVCONTAINER" = true ]; then
    # Devcontainer: use docker PostgreSQL service
    DB_HOST="db"
    DB_PORT="5432"
    DB_USER="inzone"
    DB_PASSWORD="inzone_dev"
    DB_NAME="inzone"
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
else
    # Local development: use local PostgreSQL or Docker
    DB_HOST="localhost"
    DB_PORT="5432"
    DB_USER=$(whoami)
    DB_NAME="inzone"
    DATABASE_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
fi

# Check for psql command (only needed for local development)
if [ "$IN_DEVCONTAINER" = false ]; then
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}PostgreSQL client (psql) not found.${NC}"
        echo -e "${YELLOW}Please install PostgreSQL:${NC}"
        echo "  macOS:  brew install postgresql@14"
        echo "  Ubuntu: sudo apt install postgresql postgresql-client"
        exit 1
    fi
fi

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL status...${NC}"

if [ "$IN_DEVCONTAINER" = true ]; then
    # In devcontainer, wait for the db service
    echo -e "${YELLOW}Waiting for PostgreSQL container...${NC}"
    MAX_RETRIES=30
    RETRY_COUNT=0
    while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            echo -e "${RED}PostgreSQL container not ready after ${MAX_RETRIES} attempts${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Waiting for PostgreSQL... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
        sleep 2
    done
    echo -e "${GREEN}✓ PostgreSQL container is ready${NC}"
else
    # Local development - check Unix socket first (macOS), then TCP
    pg_ready() {
        pg_isready -h /tmp -p 5432 > /dev/null 2>&1 || \
        pg_isready -h localhost -p 5432 > /dev/null 2>&1 || \
        pg_isready > /dev/null 2>&1
    }

    if ! pg_ready; then
        echo -e "${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"

        # Try different methods to start PostgreSQL
        if command -v brew &> /dev/null; then
            # macOS with Homebrew
            brew services start postgresql@14 2>/dev/null || \
            brew services start postgresql@15 2>/dev/null || \
            brew services start postgresql 2>/dev/null || true
        elif command -v systemctl &> /dev/null; then
            # Linux with systemd
            sudo systemctl start postgresql 2>/dev/null || true
        elif command -v service &> /dev/null; then
            # Linux with init.d
            sudo service postgresql start 2>/dev/null || true
        fi

        sleep 2

        # Verify it started
        if ! pg_ready; then
            echo -e "${RED}Failed to start PostgreSQL. Please start it manually:${NC}"
            echo "  macOS:  brew services start postgresql@14"
            echo "  Linux:  sudo systemctl start postgresql"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"

    # Check if database exists, create if not (local only)
    echo -e "${YELLOW}Checking database...${NC}"
    if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw inzone; then
        echo -e "${YELLOW}Creating 'inzone' database...${NC}"

        # Try multiple methods to create database (psql preferred over createdb)
        if psql -d postgres -c "CREATE DATABASE inzone;" 2>/dev/null; then
            echo -e "${GREEN}✓ Database created${NC}"
        elif psql -c "CREATE DATABASE inzone;" 2>/dev/null; then
            echo -e "${GREEN}✓ Database created${NC}"
        elif command -v createdb &> /dev/null && createdb inzone 2>/dev/null; then
            echo -e "${GREEN}✓ Database created${NC}"
        else
            echo -e "${RED}Failed to create database. Please create it manually:${NC}"
            echo "  psql -d postgres -c 'CREATE DATABASE inzone;'"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Database 'inzone' already exists${NC}"
    fi
fi

# Check if .env exists, create with appropriate config if not
if [ ! -f "apps/api/.env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > apps/api/.env << EOF
# Database connection string
DATABASE_URL="${DATABASE_URL}"

# Server configuration
PORT=3001
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
    # Update DATABASE_URL if in devcontainer
    if [ "$IN_DEVCONTAINER" = true ]; then
        # Check if the DATABASE_URL needs updating for devcontainer
        if grep -q "localhost" apps/api/.env 2>/dev/null; then
            echo -e "${YELLOW}Updating DATABASE_URL for devcontainer...${NC}"
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" apps/api/.env
            rm -f apps/api/.env.bak
            echo -e "${GREEN}✓ DATABASE_URL updated for devcontainer${NC}"
        fi
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
pnpm --filter api db:generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
pnpm db:migrate:dev --name init 2>/dev/null || pnpm db:migrate:dev
echo -e "${GREEN}✓ Migrations complete${NC}"

# Check if database is empty and seed if needed
echo -e "${YELLOW}Checking if seeding is needed...${NC}"
if [ "$IN_DEVCONTAINER" = true ]; then
    BOARD_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM boards;" 2>/dev/null | tr -d ' ' || echo "0")
else
    BOARD_COUNT=$(psql -d inzone -t -c "SELECT COUNT(*) FROM boards;" 2>/dev/null | tr -d ' ' || echo "0")
fi

if [ "$BOARD_COUNT" = "0" ] || [ -z "$BOARD_COUNT" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    pnpm db:seed
    echo -e "${GREEN}✓ Database seeded${NC}"
else
    echo -e "${GREEN}✓ Database already has data (${BOARD_COUNT} boards)${NC}"
fi

# Start the application
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Starting InZone Application${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}API:${NC} http://localhost:3001"
echo -e "${YELLOW}Web:${NC} http://localhost:5173"
if [ "$IN_DEVCONTAINER" = true ]; then
    echo -e "${YELLOW}DB:${NC}  postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi
echo ""

pnpm dev
