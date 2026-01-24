#!/usr/bin/env tsx
/**
 * Test Database Reset Script
 *
 * Resets the test database to a clean state with seed data.
 * Useful for cleaning up after failed test runs.
 *
 * Usage:
 *   pnpm --filter api test:db:reset
 *
 * Environment Variables:
 *   TEST_DATABASE_URL - Database URL for testing (optional, falls back to DATABASE_URL)
 *   DATABASE_URL - Default database URL
 */

import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from './test-db';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

async function resetDatabase() {
  console.log('Resetting test database...\n');

  if (!TEST_DATABASE_URL) {
    console.error('Error: No database URL configured.');
    console.error('Set TEST_DATABASE_URL or DATABASE_URL environment variable.');
    process.exit(1);
  }

  console.log(`Using database: ${TEST_DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  try {
    // Connect to database
    console.log('\n1. Connecting to test database...');
    await connectTestDatabase();
    console.log('   Connected.');

    // Reset database (clean all data and reseed)
    console.log('\n2. Cleaning and reseeding database...');
    await resetTestDatabase();
    console.log('   Database reset complete.');

    // Disconnect
    console.log('\n3. Disconnecting...');
    await disconnectTestDatabase();
    console.log('   Disconnected.');

    console.log('\n✅ Test database reset complete!');
  } catch (error) {
    console.error('\n❌ Test database reset failed:', error);
    await disconnectTestDatabase().catch(() => {});
    process.exit(1);
  }
}

// Only run when this script is executed directly, not when imported as a module
// Check if this file was executed directly via tsx or node
const isDirectExecution =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('reset-test-db.ts');

if (isDirectExecution) {
  resetDatabase();
}
