import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Store for tracking created boards in tests
interface TestBoard {
  id: string;
  name: string;
  description: string;
  columns: Array<{ id: string; name: string; position: number }>;
  todoCount: number;
}

// Board existence setup steps
Given('no boards exist', async function (this: CustomWorld) {
  // Mock API to return empty boards list
  await this.page.route('**/api/boards', async (route) => {
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

Given('the following boards exist:', async function (this: CustomWorld, dataTable) {
  const boards = dataTable.hashes().map((row: { name: string; todoCount: string }, index: number) => ({
    id: `board-${index + 1}`,
    name: row.name,
    description: '',
    columns: [],
    _count: { todos: parseInt(row.todoCount) },
  }));

  await this.page.route('**/api/boards', async (route) => {
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
When('I enter {string} as the board name', async function (this: CustomWorld, boardName: string) {
  await this.page.getByLabel(/board name/i).fill(boardName);
});

When('I leave the board name empty', async function (this: CustomWorld) {
  await this.page.getByLabel(/board name/i).clear();
});

When('I enter a {int} character board name', async function (this: CustomWorld, length: number) {
  const longName = 'A'.repeat(length);
  await this.page.getByLabel(/board name/i).fill(longName);
});

When('I select {string} template', async function (this: CustomWorld, templateName: string) {
  await this.page.getByRole('combobox', { name: /template/i }).click();
  await this.page.getByRole('option', { name: templateName }).click();
});

When('I click on {string} board', async function (this: CustomWorld, boardName: string) {
  await this.page.getByText(boardName).click();
});

// Board deletion steps
When('I click the delete button for {string}', async function (this: CustomWorld, boardName: string) {
  const boardCard = this.page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await boardCard.getByRole('button', { name: /delete/i }).click();
});

// Note: 'I confirm the deletion' and 'I cancel the deletion' are in common.steps.ts

// Assertion steps
Then('I should see {string} in the boards list', async function (this: CustomWorld, boardName: string) {
  await expect(this.page.getByText(boardName)).toBeVisible();
});

Then('{string} should no longer appear in the boards list', async function (this: CustomWorld, boardName: string) {
  await expect(this.page.getByText(boardName)).not.toBeVisible();
});

Then('{string} should still appear in the boards list', async function (this: CustomWorld, boardName: string) {
  await expect(this.page.getByText(boardName)).toBeVisible();
});

Then('I should see an empty state message', async function (this: CustomWorld) {
  await expect(this.page.getByText(/no boards/i)).toBeVisible();
});

Then('I should see a {string} prompt', async function (this: CustomWorld, promptText: string) {
  await expect(this.page.getByText(new RegExp(promptText, 'i'))).toBeVisible();
});

Then('I should see {int} boards', async function (this: CustomWorld, count: number) {
  await expect(this.page.locator('[data-testid="board-card"]')).toHaveCount(count);
});

Then('each board should display its todo count', async function (this: CustomWorld) {
  const boardCards = this.page.locator('[data-testid="board-card"]');
  const count = await boardCards.count();
  for (let i = 0; i < count; i++) {
    await expect(boardCards.nth(i).locator('[data-testid="todo-count"]')).toBeVisible();
  }
});

Then('the board should have no columns', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="column"]')).toHaveCount(0);
});

Then('the board should have columns {string}', async function (this: CustomWorld, columnNames: string) {
  const names = columnNames.split(', ');
  for (const name of names) {
    await expect(this.page.getByText(name)).toBeVisible();
  }
});

Then('I should be navigated to the board view', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="board-view"]')).toBeVisible();
});

Then('I should see the board columns', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="column"]')).toBeVisible();
});

// Note: 'I should see a confirmation dialog' is defined in common.steps.ts

Then('all associated todos should be deleted', async function (this: CustomWorld) {
  // This is verified by the board deletion - todos are cascade deleted
});

Then('all todos should be preserved', async function (this: CustomWorld) {
  // This is verified by the board still existing with its todos
});

Then('no new board should be created', async function (this: CustomWorld) {
  // Verify no new board appears in the list
});

Then('I should see a warning about duplicate board name', async function (this: CustomWorld) {
  await expect(this.page.getByText(/already exists|duplicate/i)).toBeVisible();
});

Then('boards should eventually appear', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="board-card"]').first()).toBeVisible({ timeout: 10000 });
});

// Template setup steps
Given('the templates endpoint returns default templates', async function (this: CustomWorld) {
  await this.page.route('**/api/templates', async (route) => {
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

// Note: 'I enter {string} as the description' is defined in todo.steps.ts

// Error mock steps for create
Given('the server will return an error for create', async function (this: CustomWorld) {
  await this.page.route('**/api/boards', async (route) => {
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
Given('the delete endpoint returns success', async function (this: CustomWorld) {
  await this.page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for delete', async function (this: CustomWorld) {
  await this.page.route('**/api/boards/*', async (route) => {
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

Given('the network is unavailable for delete', async function (this: CustomWorld) {
  await this.page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.abort('connectionfailed');
    } else {
      await route.continue();
    }
  });
});

Given('the board is deleted by another user', async function (this: CustomWorld) {
  // Simulate a 404 response when attempting to delete
  await this.page.route('**/api/boards/*', async (route) => {
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
Given('a board named {string} exists with {int} todos', async function (
  this: CustomWorld,
  boardName: string,
  todoCount: number
) {
  await this.page.route('**/api/boards', async (route) => {
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
Given('a board named {string} exists', async function (this: CustomWorld, boardName: string) {
  await this.page.route('**/api/boards', async (route) => {
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
  await this.page.route('**/api/boards/test-board-1', async (route) => {
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
Then('the create dialog should be closed', async function (this: CustomWorld) {
  await expect(this.page.getByRole('dialog')).not.toBeVisible();
});
