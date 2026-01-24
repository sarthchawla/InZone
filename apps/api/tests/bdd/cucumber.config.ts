import type { IConfiguration } from '@cucumber/cucumber';

const config: IConfiguration = {
  paths: ['tests/bdd/features/**/*.feature'],
  require: ['tests/bdd/step-definitions/**/*.ts', 'tests/bdd/support/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: [
    'progress-bar',
    'html:reports/bdd-report.html',
    'json:reports/bdd-report.json',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  parallel: 1, // Run sequentially for API tests to avoid database conflicts
  retry: 0,
  strict: true,
  worldParameters: {
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    testDbUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  },
};

export default config;
