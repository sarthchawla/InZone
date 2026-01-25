import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  steps: ['tests/bdd/steps/**/*.ts', 'tests/bdd/fixtures.ts'],
});

export default defineConfig({
  testDir,

  // Parallelism settings
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,

  // Retry and failure handling
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration - blob for CI sharding, HTML for local
  reporter: process.env.CI
    ? [['blob', { outputDir: 'blob-report' }]]
    : [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ],

  // Browser and trace settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for cross-browser testing (increases CI time)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Dev server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
