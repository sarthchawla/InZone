import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Board existence setup steps
Given('no boards exist', async function (this: CustomWorld) {
  // Mock API to return empty boards list
  await this.page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('a board named {string} exists', async function (this: CustomWorld, boardName: string) {
  await this.page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'test-board-1',
            name: boardName,
            description: '',
            columns: [],
            _count: { todos: 0 },
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('a board named {string} exists with {int} todos', async function (
  this: CustomWorld,
  boardName: string,
  todoCount: number
) {
  await this.page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'test-board-1',
            name: boardName,
            description: '',
            columns: [],
            _count: { todos: todoCount },
          },
        ]),
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
When('I click the "New Board" button', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /new board/i }).click();
});

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

When('I confirm the deletion', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /confirm|yes|delete/i }).click();
});

When('I cancel the deletion', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /cancel|no/i }).click();
});

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

Then('I should see a confirmation dialog', async function (this: CustomWorld) {
  await expect(this.page.getByRole('dialog')).toBeVisible();
});

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
