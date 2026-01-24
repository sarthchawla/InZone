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
  parallel: 2,
  retry: 0,
  strict: true,
  worldParameters: {
    baseUrl: process.env.BASE_URL || 'http://localhost:5173',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
  },
};

export default config;
