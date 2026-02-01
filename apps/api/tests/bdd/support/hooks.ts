import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanTestDatabase,
  seedTestDatabase,
} from './test-db';

// Set default timeout for steps (30 seconds for API tests)
setDefaultTimeout(30 * 1000);

/**
 * BeforeAll hook - runs once before all scenarios
 * Sets up test database connection and seeds initial data
 */
BeforeAll(async function () {
  console.log('Starting API BDD test suite...');

  // Connect to test database
  await connectTestDatabase();

  // Seed the database with built-in templates
  await seedTestDatabase();

  console.log('Test database initialized and seeded');
});

/**
 * AfterAll hook - runs once after all scenarios
 * Cleans up database and closes connections
 */
AfterAll(async function () {
  console.log('API BDD test suite completed.');

  // Clean up test database
  await cleanTestDatabase();

  // Disconnect from database
  await disconnectTestDatabase();

  console.log('Test database cleaned and disconnected');
});

/**
 * Before hook - runs before each scenario
 * Resets scenario state and cleans database for isolation
 */
Before(async function (this: CustomWorld) {
  // Reset any state from previous scenario
  this.lastResponse = null;
  this.testData = {};

  // Clean database to ensure test isolation
  // Note: We preserve templates as they are needed for tests
  await this.cleanDatabaseForScenario();
});

/**
 * After hook - runs after each scenario
 * Cleans up any resources created during the scenario
 */
After(async function (this: CustomWorld) {
  // Clean up any resources created during the scenario via API
  await this.cleanup();
});

/**
 * Before hook for scenarios tagged with @slow
 * Increases timeout for slow API operations
 */
Before({ tags: '@slow' }, async function (this: CustomWorld) {
  setDefaultTimeout(60 * 1000); // 60 seconds for slow tests
});

/**
 * Before hook for scenarios tagged with @database
 * Ensures a completely clean database state (including templates)
 */
Before({ tags: '@database' }, async function (this: CustomWorld) {
  console.log('Scenario requires completely clean database state');
  await cleanTestDatabase();
  await seedTestDatabase();
});

/**
 * Before hook for scenarios tagged with @skip-clean
 * Skips database cleaning (useful for read-only tests)
 */
Before({ tags: '@skip-clean' }, async function (this: CustomWorld) {
  this.skipDatabaseClean = true;
});

/**
 * After hook for scenarios tagged with @debug
 * Logs additional information for debugging
 */
After({ tags: '@debug' }, async function (this: CustomWorld) {
  if (this.lastResponse) {
    console.log('Last Response:', {
      status: this.lastResponse.status,
      body: JSON.stringify(this.lastResponse.body, null, 2),
    });
  }

  // Log any test data that was stored
  if (Object.keys(this.testData).length > 0) {
    console.log('Test Data:', JSON.stringify(this.testData, null, 2));
  }
});
