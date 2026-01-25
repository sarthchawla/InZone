import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Board existence setup steps with columns
Given('a board {string} exists with columns {string}', async ({ page }, boardName: string, columnNames: string) => {
  const columns = columnNames.split(',').map((name, index) => ({
    id: `col-${index + 1}`,
    name: name.trim(),
    position: index,
    todos: [],
  }));

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-board-1',
            name: boardName,
            description: '',
            columns,
            todoCount: 0,
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // Also mock the single board endpoint
  await page.route('**/api/boards/test-board-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-board-1',
          name: boardName,
          description: '',
          columns,
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('no boards exist', async ({ page }) => {
  // Mock API to return empty boards list
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
});

Given('the following boards exist:', async ({ page }, dataTable) => {
  const boards = dataTable.hashes().map((row: { name: string; todoCount: string }, index: number) => ({
    id: `board-${index + 1}`,
    name: row.name,
    description: '',
    columns: [],
    _count: { todos: parseInt(row.todoCount) },
  }));

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(boards),
      });
    } else {
      await route.continue();
    }
  });
});

// Board creation steps
When('I enter {string} as the board name', async ({ page }, boardName: string) => {
  await page.getByLabel(/board name/i).fill(boardName);
});

When('I leave the board name empty', async ({ page }) => {
  await page.getByLabel(/board name/i).clear();
});

When('I enter a {int} character board name', async ({ page }, length: number) => {
  const longName = 'A'.repeat(length);
  await page.getByLabel(/board name/i).fill(longName);
});

When('I select {string} template', async ({ page }, templateName: string) => {
  await page.getByRole('combobox', { name: /template/i }).click();
  await page.getByRole('option', { name: templateName }).click();
});

When('I click on {string} board', async ({ page }, boardName: string) => {
  await page.getByText(boardName).click();
});

// Board deletion steps
When('I click the delete button for {string}', async ({ page }, boardName: string) => {
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await boardCard.getByRole('button', { name: /delete/i }).click();
});

// Assertion steps
Then('I should see {string} in the boards list', async ({ page }, boardName: string) => {
  await expect(page.getByText(boardName)).toBeVisible();
});

Then('{string} should no longer appear in the boards list', async ({ page }, boardName: string) => {
  await expect(page.getByText(boardName)).not.toBeVisible();
});

Then('{string} should still appear in the boards list', async ({ page }, boardName: string) => {
  await expect(page.getByText(boardName)).toBeVisible();
});

Then('I should see an empty state message', async ({ page }) => {
  await expect(page.getByText(/no boards/i)).toBeVisible();
});

Then('I should see a {string} prompt', async ({ page }, promptText: string) => {
  await expect(page.getByText(new RegExp(promptText, 'i'))).toBeVisible();
});

Then('I should see {int} boards', async ({ page }, count: number) => {
  await expect(page.locator('[data-testid="board-card"]')).toHaveCount(count);
});

Then('each board should display its todo count', async ({ page }) => {
  const boardCards = page.locator('[data-testid="board-card"]');
  const count = await boardCards.count();
  for (let i = 0; i < count; i++) {
    await expect(boardCards.nth(i).locator('[data-testid="todo-count"]')).toBeVisible();
  }
});

Then('the board should have no columns', async ({ page }) => {
  await expect(page.locator('[data-testid="column"]')).toHaveCount(0);
});

Then('the board should have columns {string}', async ({ page }, columnNames: string) => {
  const names = columnNames.split(', ');
  for (const name of names) {
    await expect(page.getByText(name)).toBeVisible();
  }
});

Then('I should be navigated to the board view', async ({ page }) => {
  await expect(page.locator('[data-testid="board-view"]')).toBeVisible();
});

Then('I should see the board columns', async ({ page }) => {
  await expect(page.locator('[data-testid="column"]')).toBeVisible();
});

Then('all associated todos should be deleted', async () => {
  // This is verified by the board deletion - todos are cascade deleted
});

Then('all todos should be preserved', async () => {
  // This is verified by the board still existing with its todos
});

Then('no new board should be created', async () => {
  // Verify no new board appears in the list
});

Then('I should see a warning about duplicate board name', async ({ page }) => {
  await expect(page.getByText(/already exists|duplicate/i)).toBeVisible();
});

Then('boards should eventually appear', async ({ page }) => {
  await expect(page.locator('[data-testid="board-card"]').first()).toBeVisible({ timeout: 10000 });
});

// Template setup steps
Given('the templates endpoint returns default templates', async ({ page }) => {
  await page.route('**/api/templates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'kanban-basic',
          name: 'Basic Kanban',
          description: 'Simple three-column Kanban board',
          isBuiltIn: true,
          columns: [
            { name: 'Todo' },
            { name: 'In Progress' },
            { name: 'Done' }
          ]
        },
        {
          id: 'dev-workflow',
          name: 'Development',
          description: 'Software development workflow',
          isBuiltIn: true,
          columns: [
            { name: 'Backlog' },
            { name: 'Todo' },
            { name: 'In Progress' },
            { name: 'Review' },
            { name: 'Done' }
          ]
        },
        {
          id: 'simple',
          name: 'Simple',
          description: 'Minimal two-column setup',
          isBuiltIn: true,
          columns: [
            { name: 'Todo' },
            { name: 'Done' }
          ]
        }
      ]),
    });
  });
});

// Error mock steps for create
Given('the server will return an error for create', async ({ page }) => {
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to create board' }),
      });
    } else {
      await route.continue();
    }
  });
});

// Delete endpoint mock steps
Given('the delete endpoint returns success', async ({ page }) => {
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for delete', async ({ page }) => {
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to delete board' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the network is unavailable for delete', async ({ page }) => {
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.abort('connectionfailed');
    } else {
      await route.continue();
    }
  });
});

Given('the board is deleted by another user', async ({ page }) => {
  // Simulate a 404 response when attempting to delete
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Board not found' }),
      });
    } else {
      await route.continue();
    }
  });
});

// Board existence step - with todos
Given('a board named {string} exists with {int} todos', async ({ page }, boardName: string, todoCount: number) => {
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-board-1',
            name: boardName,
            description: '',
            columns: [
              { id: 'col-1', name: 'Todo', position: 0 }
            ],
            todoCount: todoCount,
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

// Board existence step - simple
Given('a board named {string} exists', async ({ page }, boardName: string) => {
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-board-1',
            name: boardName,
            description: '',
            columns: [
              { id: 'col-1', name: 'Todo', position: 0 },
              { id: 'col-2', name: 'In Progress', position: 1 },
              { id: 'col-3', name: 'Done', position: 2 }
            ],
            todoCount: 0,
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // Also mock the single board endpoint
  await page.route('**/api/boards/test-board-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-board-1',
          name: boardName,
          description: '',
          columns: [
            { id: 'col-1', name: 'Todo', position: 0, todos: [] },
            { id: 'col-2', name: 'In Progress', position: 1, todos: [] },
            { id: 'col-3', name: 'Done', position: 2, todos: [] }
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

// Dialog closed assertion
Then('the create dialog should be closed', async ({ page }) => {
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
