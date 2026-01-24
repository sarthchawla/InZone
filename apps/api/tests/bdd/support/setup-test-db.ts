#!/usr/bin/env tsx
/**
 * Test Database Setup Script
 *
 * Sets up the test database with migrations and seed data.
 * Run this before running BDD tests for the first time or after schema changes.
 *
 * Usage:
 *   pnpm --filter api test:db:setup
 *
 * Environment Variables:
 *   TEST_DATABASE_URL - Database URL for testing (optional, falls back to DATABASE_URL)
 *   DATABASE_URL - Default database URL
 */

import { execSync } from 'child_process';
import { connectTestDatabase, disconnectTestDatabase, seedTestDatabase } from './test-db';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

async function setupTestDatabase() {
  console.log('Setting up test database...\n');

  if (!TEST_DATABASE_URL) {
    console.error('Error: No database URL configured.');
    console.error('Set TEST_DATABASE_URL or DATABASE_URL environment variable.');
    process.exit(1);
  }

  console.log(`Using database: ${TEST_DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  try {
    // Step 1: Run Prisma migrations
    // Note: execSync is safe here as the command is hardcoded with no user input
    console.log('\n1. Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
    });
    console.log('   Migrations applied successfully.');

    // Step 2: Generate Prisma client
    console.log('\n2. Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
    });
    console.log('   Prisma client generated.');

    // Step 3: Connect and seed the database
    console.log('\n3. Seeding test database with templates...');
    await connectTestDatabase();
    await seedTestDatabase();
    await disconnectTestDatabase();
    console.log('   Database seeded successfully.');

    console.log('\n✅ Test database setup complete!');
    console.log('\nYou can now run BDD tests with:');
    console.log('  pnpm --filter api test:bdd');
  } catch (error) {
    console.error('\n❌ Test database setup failed:', error);
    process.exit(1);
  }
}

setupTestDatabase();
