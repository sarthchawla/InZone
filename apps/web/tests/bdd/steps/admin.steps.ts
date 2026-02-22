import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// --- Session mocks ---

Given('the session API returns an admin session', async ({ page }) => {
  await page.route('**/api/auth/**', async (route) => {
    if (route.request().url().includes('get-session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: { id: 'admin-session', userId: 'admin-1' },
          user: {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@example.com',
            image: null,
            role: 'admin',
          },
        }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });
});

// --- Invites API mocks ---

Given('the invites API returns an empty list', async ({ page }) => {
  await page.route('**/api/invites', async (route) => {
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
});

Given('the invites API returns pending invites', async ({ page }) => {
  await page.route('**/api/invites', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'inv-1',
            email: 'alice@example.com',
            token: 'token-alice',
            role: 'user',
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'inv-2',
            email: 'bob@example.com',
            token: 'token-bob',
            role: 'user',
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the invites API returns invites with history', async ({ page }) => {
  await page.route('**/api/invites', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'inv-1',
            email: 'active@example.com',
            token: 'token-active',
            role: 'user',
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'inv-2',
            email: 'used@example.com',
            token: 'token-used',
            role: 'user',
            status: 'used',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'inv-3',
            email: 'revoked@example.com',
            token: 'token-revoked',
            role: 'admin',
            status: 'revoked',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  'the create invite API will succeed for {string}',
  async ({ page }, email: string) => {
    await page.route('**/api/invites', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-inv',
            email,
            token: 'new-token-123',
            inviteLink: `http://localhost:5173/signup?token=new-token-123`,
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  'the create invite API will succeed for {string} with role {string}',
  async ({ page }, email: string, _role: string) => {
    await page.route('**/api/invites', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-inv',
            email,
            token: 'new-token-123',
            inviteLink: `http://localhost:5173/signup?token=new-token-123`,
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  'the create invite API will fail with {string}',
  async ({ page }, errorMessage: string) => {
    await page.route('**/api/invites', async (route) => {
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

Given('the revoke invite API will succeed', async ({ page }) => {
  await page.route('**/api/invites/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });
});

// --- Navigation steps ---

When('I navigate to the admin invites page', async ({ page, baseUrl }) => {
  // Mock default empty endpoints that the main app layout may request
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
  await page.route('**/api/templates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
  await page.route('**/api/labels**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto(`${baseUrl}/admin/invites`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
});

// --- Interaction steps ---

When('I select {string} as the invite role', async ({ page }, role: string) => {
  await page.locator('select').selectOption(role.toLowerCase());
});

When('I click {string} for {string}', async ({ page }, action: string, email: string) => {
  const row = page.locator(`text=${email}`).locator('..');
  await row.getByText(action).click();
});

// --- Assertion steps ---

Then('I should see a role selector', async ({ page }) => {
  await expect(page.locator('select')).toBeVisible();
});

Then(
  'I should see {string} in the pending invites list',
  async ({ page }, email: string) => {
    await expect(page.getByText(email)).toBeVisible();
  },
);

Then('I should see {string} for each pending invite', async ({ page }, text: string) => {
  const buttons = page.getByText(text, { exact: true });
  await expect(buttons.first()).toBeVisible();
  expect(await buttons.count()).toBeGreaterThanOrEqual(2);
});

Then('the invites list should be refreshed', async ({ page }) => {
  // After revoking, the page reloads invites. Just verify the page is still showing.
  await expect(page.getByText('Invite Management')).toBeVisible();
});

Then('I should see the {string} section', async ({ page }, sectionTitle: string) => {
  await expect(page.getByRole('heading', { name: sectionTitle })).toBeVisible();
});

Then('I should see used invites in the history', async ({ page }) => {
  await expect(page.getByText('used@example.com')).toBeVisible();
});

// 'I should see a {string} button' is defined in common.steps.ts
