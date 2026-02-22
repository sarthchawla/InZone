import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// --- Session mocks ---

Given('the session API returns no active session', async ({ page }) => {
  await page.route('**/api/auth/**', async (route) => {
    if (route.request().url().includes('get-session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: null, user: null }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });
});

// --- Sign-in API mocks ---

Given('the sign-in API will succeed', async ({ page }) => {
  await page.route('**/api/auth/sign-in/email', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { id: 'new-session', userId: 'user-1' },
        user: { id: 'user-1', name: 'Test User', email: 'user@example.com' },
      }),
    });
  });
});

Given('the sign-in API will succeed for username', async ({ page }) => {
  await page.route('**/api/auth/sign-in/username', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { id: 'new-session', userId: 'user-1' },
        user: { id: 'user-1', name: 'Test User', email: 'user@example.com' },
      }),
    });
  });
});

Given('the sign-in API will fail with {string}', async ({ page }, errorMessage: string) => {
  await page.route('**/api/auth/sign-in/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: errorMessage } }),
    });
  });
});

// --- Sign-up API mocks ---

Given('the invite validation API returns valid for {string}', async ({ page }, email: string) => {
  await page.route('**/api/invites/validate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true, email }),
    });
  });
});

Given('the invite validation API returns invalid', async ({ page }) => {
  await page.route('**/api/invites/validate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: false }),
    });
  });
});

Given('the invite validation API is slow', async ({ page }) => {
  await page.route('**/api/invites/validate**', async (route) => {
    // Delay indefinitely to keep loading state visible
    await new Promise(() => {});
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true, email: 'test@example.com' }),
    });
  });
});

Given('the sign-up API will succeed', async ({ page }) => {
  await page.route('**/api/auth/sign-up/email', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { id: 'new-session', userId: 'user-1' },
        user: { id: 'user-1', name: 'Test User', email: 'user@example.com' },
      }),
    });
  });
});

Given('the sign-up API will fail with {string}', async ({ page }, errorMessage: string) => {
  await page.route('**/api/auth/sign-up/email', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: errorMessage } }),
    });
  });
});

Given('the security questions API will succeed', async ({ page }) => {
  await page.route('**/api/security-questions/setup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
});

// --- Access request API mocks ---

Given('the access request API will succeed', async ({ page }) => {
  await page.route('**/api/access-requests', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'req-1', status: 'pending' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  'the access request API will fail with {string}',
  async ({ page }, errorMessage: string) => {
    await page.route('**/api/access-requests', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: errorMessage }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

// --- Navigation steps ---

When('I navigate to the login page', async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}/login`);
  await page.waitForLoadState('domcontentloaded');
});

When('I navigate to the signup page with token {string}', async ({ page, baseUrl }, token: string) => {
  await page.goto(`${baseUrl}/signup?token=${token}`);
  await page.waitForLoadState('domcontentloaded');
});

When('I navigate to the request access page', async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}/request-access`);
  await page.waitForLoadState('domcontentloaded');
});

// --- Form interaction steps ---

When('I fill in {string} with {string}', async ({ page }, label: string, value: string) => {
  await page.getByLabel(label).fill(value);
});

When('I fill in the reason with {string}', async ({ page }, value: string) => {
  await page.locator('textarea').fill(value);
});

When('I fill in the signup form with valid data', async ({ page }) => {
  await page.getByLabel('Name *').fill('Test User');
  await page.getByLabel('Password *', { exact: true }).fill('Abcdef1!');
  await page.getByLabel('Confirm Password *').fill('Abcdef1!');

  // Fill security questions
  const q1 = page.getByLabel('Security question 1');
  await q1.selectOption('What was the name of your first pet?');
  await page.getByPlaceholder('Your answer').nth(0).fill('Buddy');

  const q2 = page.getByLabel('Security question 2');
  await q2.selectOption('In what city were you born?');
  await page.getByPlaceholder('Your answer').nth(1).fill('New York');

  const q3 = page.getByLabel('Security question 3');
  await q3.selectOption('What was the name of your first school?');
  await page.getByPlaceholder('Your answer').nth(2).fill('Lincoln Elementary');
});

When('I click the {string} link', async ({ page }, linkText: string) => {
  await page.getByRole('link', { name: linkText }).click();
});

// --- Assertion steps ---

Then('I should see the heading {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('heading', { name: text })).toBeVisible({ timeout: 5000 });
});

Then('I should see the text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible({ timeout: 5000 });
});

Then('I should see an {string} input', async ({ page }, label: string) => {
  await expect(page.getByLabel(label)).toBeVisible();
});

Then('I should see a {string} input', async ({ page }, label: string) => {
  await expect(page.getByLabel(label)).toBeVisible();
});

Then('I should see a {string} link', async ({ page }, linkText: string) => {
  await expect(page.getByRole('link', { name: linkText })).toBeVisible();
});

Then('I should see a reason textarea', async ({ page }) => {
  await expect(page.locator('textarea')).toBeVisible();
});

Then('I should see {string} section', async ({ page }, sectionTitle: string) => {
  await expect(page.getByText(sectionTitle)).toBeVisible();
});

Then('I should see a loading spinner', async ({ page }) => {
  await expect(page.getByRole('status', { name: /Loading/i })).toBeVisible({ timeout: 3000 });
});

Then('the {string} button should be disabled', async ({ page }, buttonText: string) => {
  await expect(page.getByRole('button', { name: buttonText })).toBeDisabled();
});

Then('the {string} button should be enabled', async ({ page }, buttonText: string) => {
  await expect(page.getByRole('button', { name: buttonText })).toBeEnabled();
});

Then('the {string} input should have value {string}', async ({ page }, label: string, value: string) => {
  await expect(page.getByLabel(label)).toHaveValue(value);
});

Then('the {string} input should be read-only', async ({ page }, label: string) => {
  await expect(page.getByLabel(label)).toHaveAttribute('readonly', '');
});

Then('I should see an alert with {string}', async ({ page }, message: string) => {
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('alert')).toContainText(message);
});

Then('I should be redirected to {string}', async ({ page }, path: string) => {
  await page.waitForURL(`**${path}`, { timeout: 5000 });
});

Then('I should be on the {string} page', async ({ page }, path: string) => {
  await page.waitForURL(`**${path}`, { timeout: 5000 });
});

Then('the password check {string} should be met', async ({ page }, label: string) => {
  await expect(page.locator(`[aria-label="${label}: met"]`)).toBeVisible();
});

Then('the password check {string} should not be met', async ({ page }, label: string) => {
  await expect(page.locator(`[aria-label="${label}: not met"]`)).toBeVisible();
});
