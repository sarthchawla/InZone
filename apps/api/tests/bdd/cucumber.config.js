/** @type {import('@cucumber/cucumber').IConfiguration} */
const config = {
  paths: ['tests/bdd/features/**/*.feature'],
  import: ['tests/bdd/step-definitions/**/*.ts', 'tests/bdd/support/**/*.ts'],
  requireModule: ['tsx'],
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
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    testDbUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  },
};

module.exports = { default: config };
