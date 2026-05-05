import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  steps: ['tests/bdd/steps/**/*.ts', 'tests/bdd/fixtures.ts'],
  tags: 'not @wip',
});

const apiPort = process.env.API_PORT || '3001';
const playgroundPort = process.env.VITE_MCP_PLAYGROUND_PORT || '5273';

export default defineConfig({
  testDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['blob', { outputDir: 'blob-report' }]]
    : [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ],
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${playgroundPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: `http://localhost:${apiPort}/health`,
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        API_PORT: apiPort,
        VITE_AUTH_BYPASS: 'true',
        VITE_MCP_PLAYGROUND_PORT: playgroundPort,
      },
    },
    {
      command: 'pnpm --filter mcp-playground dev',
      url: `http://localhost:${playgroundPort}`,
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        VITE_API_URL: `http://localhost:${apiPort}`,
        VITE_MCP_PLAYGROUND_PORT: playgroundPort,
      },
    },
  ],
});
