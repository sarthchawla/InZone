import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { CustomWorld } from './world';

// Set default timeout to 30 seconds
setDefaultTimeout(30 * 1000);

// BeforeAll hook - runs once before all scenarios
BeforeAll(async function () {
  console.log('Starting BDD test suite...');
});

// Before hook - runs before each scenario
Before(async function (this: CustomWorld) {
  await this.init();
});

// After hook - runs after each scenario
After(async function (this: CustomWorld, scenario) {
  // Take screenshot on failure
  if (scenario.result?.status === 'FAILED' && this.page) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const scenarioName = scenario.pickle.name.replace(/[^a-z0-9]/gi, '_');
    await this.page.screenshot({
      path: `test-results/screenshots/${scenarioName}-${timestamp}.png`,
      fullPage: true,
    });
  }

  await this.cleanup();
});

// AfterAll hook - runs once after all scenarios
AfterAll(async function () {
  console.log('BDD test suite completed.');
});
