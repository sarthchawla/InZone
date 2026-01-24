import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { CustomWorld } from './world';

// Set default timeout for steps (30 seconds for API tests)
setDefaultTimeout(30 * 1000);

/**
 * BeforeAll hook - runs once before all scenarios
 * Use for global setup like database initialization
 */
BeforeAll(async function () {
  console.log('Starting API BDD test suite...');
  // Global setup could include:
  // - Verifying API server is running
  // - Setting up test database
  // - Creating seed data
});

/**
 * AfterAll hook - runs once after all scenarios
 * Use for global cleanup
 */
AfterAll(async function () {
  console.log('API BDD test suite completed.');
  // Global cleanup could include:
  // - Resetting database state
  // - Closing connections
});

/**
 * Before hook - runs before each scenario
 * Use for per-scenario setup
 */
Before(async function (this: CustomWorld) {
  // Reset any state from previous scenario
  this.lastResponse = null;
  this.testData = {};
});

/**
 * After hook - runs after each scenario
 * Use for per-scenario cleanup
 */
After(async function (this: CustomWorld) {
  // Clean up any resources created during the scenario
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
 * Ensures a clean database state
 */
Before({ tags: '@database' }, async function (this: CustomWorld) {
  // Could add database reset logic here
  console.log('Scenario requires clean database state');
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
});
