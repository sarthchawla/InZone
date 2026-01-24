import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Navigation steps
Given('I am on the boards list page', async function (this: CustomWorld) {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

Given('I am on the board view page', async function (this: CustomWorld) {
  // Wait for board view to be loaded - implementation depends on actual routing
  await this.page.waitForSelector('[data-testid="board-view"]');
});

Given('I navigate to the boards list', async function (this: CustomWorld) {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

// Error simulation steps
Given('the server will return an error', async function (this: CustomWorld) {
  // Mock API to return 500 error
  await this.page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });
});

Given('the API is unavailable', async function (this: CustomWorld) {
  await this.page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');
  });
});

Given('the network is slow', async function (this: CustomWorld) {
  // Simulate slow network by delaying responses
  await this.page.route('**/api/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
});

Given('the network is unavailable', async function (this: CustomWorld) {
  await this.page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');
  });
});

// Common UI interactions
When('I click {string}', async function (this: CustomWorld, buttonText: string) {
  await this.page.getByRole('button', { name: buttonText }).click();
});

When('I click the {string} button', async function (this: CustomWorld, buttonText: string) {
  await this.page.getByRole('button', { name: buttonText }).click();
});

// Deletion confirmation steps - shared across features
When('I confirm the deletion', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /confirm|yes|delete/i }).click();
});

When('I cancel the deletion', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /cancel|no/i }).click();
});

// Loading state checks
Then('I should see a loading indicator', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="loading"]')).toBeVisible();
});

Then('I should see a {string} button', async function (this: CustomWorld, buttonText: string) {
  await expect(this.page.getByRole('button', { name: buttonText })).toBeVisible();
});

// Error message checks
Then('I should see an error message {string}', async function (this: CustomWorld, message: string) {
  await expect(this.page.getByText(message)).toBeVisible();
});

Then('I should see an error {string}', async function (this: CustomWorld, message: string) {
  await expect(this.page.getByText(message)).toBeVisible();
});

// Confirmation dialog check - shared across features
Then('I should see a confirmation dialog', async function (this: CustomWorld) {
  await expect(this.page.getByRole('dialog')).toBeVisible();
});
