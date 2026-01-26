import { createBdd } from 'playwright-bdd';
import { test, expect, MockedRoutes } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Helper to set up default API mocks before navigation
// Only sets up mocks for routes that haven't been mocked by Given steps
async function setupDefaultMocks(page: import('@playwright/test').Page, mockedRoutes: MockedRoutes) {
  // Default empty boards list - only if not already mocked
  if (!mockedRoutes.has('boards')) {
    await page.route('**/api/boards', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Default empty templates list - only if not already mocked
  // Templates are fetched when the page loads and cached by React Query
  if (!mockedRoutes.has('templates')) {
    await page.route('**/api/templates', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Default empty labels list - only if not already mocked
  if (!mockedRoutes.has('labels')) {
    await page.route('**/api/labels**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });
  }
}

// Navigation steps
Given('I am on the boards list page', async ({ page, baseUrl, mockedRoutes }) => {
  // Set up default mocks before navigation to prevent real API calls
  await setupDefaultMocks(page, mockedRoutes);
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
});

Given('I am on the board view page', async ({ page }) => {
  // Wait for board view to be loaded - implementation depends on actual routing
  await page.waitForSelector('[data-testid="board-view"]');
});

// Use Given for navigation steps - playwright-bdd allows Given/When/Then interchangeably for same text
Given('I navigate to the boards list', async ({ page, baseUrl, mockedRoutes }) => {
  // Set up default mocks before navigation to prevent real API calls
  await setupDefaultMocks(page, mockedRoutes);
  await page.goto(baseUrl);
  // Use domcontentloaded instead of networkidle to avoid hanging on network errors
  await page.waitForLoadState('domcontentloaded');
  // Give React time to render
  await page.waitForTimeout(500);
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

Given('the API is unavailable', async ({ page, mockedRoutes }) => {
  // Mark all routes as mocked since we're handling them
  mockedRoutes.add('boards');
  mockedRoutes.add('labels');
  await page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');
  });
});

Given('the network is slow', async ({ page, mockedRoutes }) => {
  // Mark all routes as mocked since we're handling them
  mockedRoutes.add('boards');
  mockedRoutes.add('labels');
  // Simulate slow network by delaying responses then returning empty data
  await page.route('**/api/boards', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'board-1', name: 'Test Board', description: '', columns: [], todoCount: 0 }
      ]),
    });
  });
  await page.route('**/api/labels**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
});

Given('the network is unavailable', async ({ page, mockedRoutes }) => {
  // Mark all routes as mocked since we're handling them
  mockedRoutes.add('boards');
  mockedRoutes.add('labels');
  await page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');
  });
});

// Common UI interactions
When('I click {string}', async ({ page }, buttonText: string) => {
  // Map common button text to partial matches (prefix-based)
  // e.g., "Create" matches "Create Board", "Save" matches "Save Todo"
  const buttonPrefixes: Record<string, string[]> = {
    'Save': ['Save', 'Add', 'Submit'],
    'Create': ['Create'],
    'Cancel': ['Cancel', 'Close'],
    'Delete': ['Delete', 'Remove'],
    'Confirm': ['Confirm', 'Yes'],
  };

  const prefixes = buttonPrefixes[buttonText] || [buttonText];

  // Try to click within a dialog first (modal context), then fallback to page
  const dialog = page.getByRole('dialog');

  if (await dialog.isVisible().catch(() => false)) {
    // First try exact match within dialog
    for (const prefix of prefixes) {
      const exactButton = dialog.getByRole('button', { name: prefix, exact: true });
      if (await exactButton.count() > 0) {
        await exactButton.click();
        return;
      }
    }
    // Then try prefix match (button name starts with the text)
    for (const prefix of prefixes) {
      const buttons = dialog.getByRole('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const name = await buttons.nth(i).getAttribute('name') || await buttons.nth(i).textContent() || '';
        if (name.startsWith(prefix) || name.toLowerCase().startsWith(prefix.toLowerCase())) {
          await buttons.nth(i).click();
          return;
        }
      }
    }
  }

  // Fallback to page-level button - first try exact match
  for (const prefix of prefixes) {
    const exactButton = page.getByRole('button', { name: prefix, exact: true });
    if (await exactButton.count() > 0) {
      await exactButton.click();
      return;
    }
  }

  // Then try prefix match on page
  for (const prefix of prefixes) {
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const name = await buttons.nth(i).getAttribute('name') || await buttons.nth(i).textContent() || '';
      if (name.startsWith(prefix) || name.toLowerCase().startsWith(prefix.toLowerCase())) {
        await buttons.nth(i).click();
        return;
      }
    }
  }

  // Final fallback: try regex match for the text anywhere in button name
  const regex = new RegExp(buttonText, 'i');
  await page.getByRole('button', { name: regex }).click();
});

When('I click the {string} button', async ({ page }, buttonText: string) => {
  // Try to click within a dialog first (modal context), then fallback to page
  const dialog = page.getByRole('dialog');
  const dialogButton = dialog.getByRole('button', { name: buttonText });

  if (await dialog.isVisible().catch(() => false)) {
    if (await dialogButton.isVisible().catch(() => false)) {
      await dialogButton.click();
      return;
    }
  }

  // Fallback to page-level button
  await page.getByRole('button', { name: buttonText }).click();
});

// Deletion confirmation steps - shared across features
When('I confirm the deletion', async ({ page }) => {
  // Click the confirm/delete button in the delete confirmation modal
  // UI uses "Confirm Delete" or similar variations
  const dialog = page.getByRole('dialog');
  const confirmButton = dialog.getByRole('button', { name: /confirm delete|^delete$|^confirm$/i });
  await confirmButton.click();
});

When('I cancel the deletion', async ({ page }) => {
  // Click the cancel button in the delete confirmation modal
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /cancel/i }).click();
});

// Loading state checks
Then('I should see a loading indicator', async ({ page }) => {
  // Loading indicator might appear briefly - use shorter timeout but allow for timing variance
  await expect(page.locator('[data-testid="loading"]')).toBeVisible({ timeout: 3000 });
});

Then('I should see a {string} button', async ({ page }, buttonText: string) => {
  await expect(page.getByRole('button', { name: buttonText })).toBeVisible();
});

// Error message checks
Then('I should see an error message {string}', async ({ page }, message: string) => {
  // Wait longer for error messages since React Query may retry failed requests
  const timeout = 15000;

  // Try exact match first, then partial match (case-insensitive)
  const exactMatch = page.getByText(message);
  if (await exactMatch.count() > 0) {
    await expect(exactMatch).toBeVisible({ timeout });
    return;
  }
  // Try partial match with regex
  const regex = new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  await expect(page.getByText(regex)).toBeVisible({ timeout });
});

Then('I should see an error {string}', async ({ page }, message: string) => {
  // Wait longer for error messages since React Query may retry failed requests
  const timeout = 15000;

  // Try exact match first, then partial match (case-insensitive)
  const exactMatch = page.getByText(message);
  if (await exactMatch.count() > 0) {
    await expect(exactMatch).toBeVisible({ timeout });
    return;
  }
  // Try partial match with regex
  const regex = new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  await expect(page.getByText(regex)).toBeVisible({ timeout });
});

// Confirmation dialog check - shared across features
Then('I should see a confirmation dialog', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible();
});
