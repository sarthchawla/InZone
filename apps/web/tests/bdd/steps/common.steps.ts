import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Navigation steps
Given('I am on the boards list page', async ({ page, baseUrl }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
});

Given('I am on the board view page', async ({ page }) => {
  // Wait for board view to be loaded - implementation depends on actual routing
  await page.waitForSelector('[data-testid="board-view"]');
});

Given('I navigate to the boards list', async ({ page, baseUrl }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
});

// Error simulation steps
Given('the server will return an error', async ({ page }) => {
  // Mock API to return 500 error
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });
});

Given('the API is unavailable', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');
  });
});

Given('the network is slow', async ({ page }) => {
  // Simulate slow network by delaying responses
  await page.route('**/api/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
});

Given('the network is unavailable', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');
  });
});

// Common UI interactions
When('I click {string}', async ({ page }, buttonText: string) => {
  await page.getByRole('button', { name: buttonText }).click();
});

When('I click the {string} button', async ({ page }, buttonText: string) => {
  await page.getByRole('button', { name: buttonText }).click();
});

// Deletion confirmation steps - shared across features
When('I confirm the deletion', async ({ page }) => {
  await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
});

When('I cancel the deletion', async ({ page }) => {
  await page.getByRole('button', { name: /cancel|no/i }).click();
});

// Loading state checks
Then('I should see a loading indicator', async ({ page }) => {
  await expect(page.locator('[data-testid="loading"]')).toBeVisible();
});

Then('I should see a {string} button', async ({ page }, buttonText: string) => {
  await expect(page.getByRole('button', { name: buttonText })).toBeVisible();
});

// Error message checks
Then('I should see an error message {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message)).toBeVisible();
});

Then('I should see an error {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message)).toBeVisible();
});

// Confirmation dialog check - shared across features
Then('I should see a confirmation dialog', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible();
});
