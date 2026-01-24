# Environment Variable Setup Instructions

## Date: 2025-01-24

This document provides instructions for setting up environment variables for the InZone application.

---

## Backend API Environment (`apps/api/.env`)

### Required Changes:

| Variable | Action | Value | Description |
|----------|--------|-------|-------------|
| DATABASE_URL | Add | `postgresql://inzone:inzone_dev@localhost:5432/inzone` | Main database connection for development |
| PORT | Add | `3000` | API server port (optional, defaults to 3000) |
| NODE_ENV | Add | `development` | Environment mode |
| TEST_DATABASE_URL | Add | `postgresql://inzone:inzone_dev@localhost:5432/inzone_test` | Test database for BDD/integration tests |
| DEBUG_TESTS | Add | `false` | Set to `true` for verbose test logging |

### Instructions:

1. Navigate to the `apps/api` directory
2. Create a new file named `.env`
3. Add the following content:

```env
# InZone API Environment Configuration

# Database Configuration
DATABASE_URL=postgresql://inzone:inzone_dev@localhost:5432/inzone

# Server Configuration
PORT=3000
NODE_ENV=development

# Test Configuration (for running tests locally)
TEST_DATABASE_URL=postgresql://inzone:inzone_dev@localhost:5432/inzone_test
DEBUG_TESTS=false
```

4. If using different PostgreSQL credentials, update the username/password accordingly
5. Restart the API server after making changes

---

## Test Database Setup

### For Local Development:

1. Start the PostgreSQL container:
   ```bash
   docker compose -f docker/docker-compose.db.yml up -d
   ```

2. Create the test database:
   ```bash
   # Connect to postgres and create test database
   docker exec -it inzone-postgres psql -U inzone -c "CREATE DATABASE inzone_test;"
   ```

3. Run migrations on test database:
   ```bash
   DATABASE_URL=postgresql://inzone:inzone_dev@localhost:5432/inzone_test pnpm --filter api db:migrate:deploy
   ```

4. Seed the test database:
   ```bash
   DATABASE_URL=postgresql://inzone:inzone_dev@localhost:5432/inzone_test pnpm --filter api db:seed
   ```

### For CI Environment:

The CI workflows automatically:
- Spin up a PostgreSQL service container
- Run migrations against the test database
- Seed the database with initial data

Database configuration in CI:
- User: `test`
- Password: `test`
- Database: `inzone_test`
- URL: `postgresql://test:test@localhost:5432/inzone_test`

---

## Notes

- The test database should be separate from the development database to avoid data corruption during testing
- CI environments use a different database user/password for security
- The `DEBUG_TESTS` flag enables verbose Prisma query logging during test runs
