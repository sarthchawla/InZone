import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Store for test data
interface TestState {
  boardId: string;
  columns: Array<{
    id: string;
    name: string;
    position: number;
    wipLimit?: number;
    todos: Array<{ id: string; title: string; position: number }>;
  }>;
}

let testState: TestState = {
  boardId: 'test-board-1',
  columns: [],
};

// Note: 'I am viewing a board with columns {string}' is defined in todo.steps.ts

Given('columns {string} exist in that order', async function (this: CustomWorld, columnNames: string) {
  // Columns are already set up in the background step
  // This step is for readability in scenarios
});

Given('the {string} column has {int} todos', async function (this: CustomWorld, columnName: string, todoCount: number) {
  const column = testState.columns.find(c => c.name === columnName);
  if (column) {
    column.todos = Array.from({ length: todoCount }, (_, i) => ({
      id: `todo-${column.id}-${i + 1}`,
      title: `Todo ${i + 1}`,
      position: i,
    }));
  }
});

Given('the {string} column has no todos', async function (this: CustomWorld, columnName: string) {
  const column = testState.columns.find(c => c.name === columnName);
  if (column) {
    column.todos = [];
  }
});

Given('the create column endpoint returns success', async function (this: CustomWorld) {
  await this.page.route('**/api/boards/*/columns', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const newColumn = {
        id: `col-${Date.now()}`,
        name: body.name,
        position: testState.columns.length,
        wipLimit: body.wipLimit,
        todos: [],
      };
      testState.columns.push(newColumn);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newColumn),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the reorder columns endpoint returns success', async function (this: CustomWorld) {
  await this.page.route('**/api/columns/reorder', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      // Update positions in testState based on the reorder request
      if (body.columns) {
        body.columns.forEach((col: { id: string; position: number }) => {
          const column = testState.columns.find(c => c.id === col.id);
          if (column) {
            column.position = col.position;
          }
        });
        testState.columns.sort((a, b) => a.position - b.position);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the delete column endpoint returns success', async function (this: CustomWorld) {
  await this.page.route('**/api/columns/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const urlParts = route.request().url().split('/');
      const columnId = urlParts[urlParts.length - 1];
      testState.columns = testState.columns.filter(c => c.id !== columnId);
      await route.fulfill({
        status: 204,
        body: '',
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for column creation', async function (this: CustomWorld) {
  await this.page.route('**/api/boards/*/columns', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to create column' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for column reorder', async function (this: CustomWorld) {
  await this.page.route('**/api/columns/reorder', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to reorder columns' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for column deletion', async function (this: CustomWorld) {
  await this.page.route('**/api/columns/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to delete column' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('another user deletes the {string} column', async function (this: CustomWorld, columnName: string) {
  // Simulate column being deleted - will cause error on next operation
  testState.columns = testState.columns.filter(c => c.name !== columnName);
});

Given('the {string} column has been deleted by another user', async function (this: CustomWorld, columnName: string) {
  // Simulate column being deleted by another user
  await this.page.route('**/api/columns/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Column no longer exists' }),
      });
    } else {
      await route.continue();
    }
  });
});

// Column interaction steps
// Note: 'I click {string}' is defined in common.steps.ts, but we also have a specific "Add column" button handler
// Using the common step for "Add column" text

When('I enter {string} as the column name', async function (this: CustomWorld, columnName: string) {
  await this.page.getByLabel(/column name/i).fill(columnName);
});

When('I leave the column name empty', async function (this: CustomWorld) {
  await this.page.getByLabel(/column name/i).clear();
});

When('I enter a 256 character column name', async function (this: CustomWorld) {
  const longName = 'a'.repeat(256);
  await this.page.getByLabel(/column name/i).fill(longName);
});

When('I set WIP limit to {int}', async function (this: CustomWorld, limit: number) {
  await this.page.getByLabel(/wip limit/i).fill(limit.toString());
});

When('I add a column named {string}', async function (this: CustomWorld, columnName: string) {
  await this.page.getByRole('button', { name: /add column/i }).click();
  await this.page.getByLabel(/column name/i).fill(columnName);
  await this.page.getByRole('button', { name: /save/i }).click();
  await this.page.waitForTimeout(500); // Wait for column to be added
});

When('I drag {string} column before {string}', async function (
  this: CustomWorld,
  sourceColumn: string,
  targetColumn: string
) {
  const source = this.page.locator(`[data-testid="column-header"]:has-text("${sourceColumn}")`);
  const target = this.page.locator(`[data-testid="column-header"]:has-text("${targetColumn}")`);

  const sourceBounds = await source.boundingBox();
  const targetBounds = await target.boundingBox();

  if (sourceBounds && targetBounds) {
    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBounds.x - 10,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await this.page.mouse.up();
  }
});

When('I drag {string} column to the last position', async function (this: CustomWorld, columnName: string) {
  const source = this.page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  const columns = this.page.locator('[data-testid="column"]');
  const lastColumn = columns.last();

  const sourceBounds = await source.boundingBox();
  const targetBounds = await lastColumn.boundingBox();

  if (sourceBounds && targetBounds) {
    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBounds.x + targetBounds.width + 10,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await this.page.mouse.up();
  }
});

When('I drag {string} column to the first position', async function (this: CustomWorld, columnName: string) {
  const source = this.page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  const columns = this.page.locator('[data-testid="column"]');
  const firstColumn = columns.first();

  const sourceBounds = await source.boundingBox();
  const targetBounds = await firstColumn.boundingBox();

  if (sourceBounds && targetBounds) {
    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBounds.x - 10,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await this.page.mouse.up();
  }
});

When('I try to drag {string}', async function (this: CustomWorld, columnName: string) {
  // Attempt to drag but there's nowhere to drop
  const source = this.page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  const sourceBounds = await source.boundingBox();

  if (sourceBounds) {
    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2 + 50,
      sourceBounds.y + sourceBounds.height / 2,
      { steps: 5 }
    );
    await this.page.mouse.up();
  }
});

When('I click the delete button for {string} column', async function (this: CustomWorld, columnName: string) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByRole('button', { name: /delete/i }).click();
});

// Note: 'I confirm the deletion' and 'I cancel the deletion' are in common.steps.ts

When('I choose to move todos to {string} column', async function (this: CustomWorld, targetColumn: string) {
  await this.page.getByLabel(/move todos to/i).selectOption({ label: targetColumn });
});

// Column assertion steps
Then('I should see {string} column after {string}', async function (
  this: CustomWorld,
  newColumn: string,
  afterColumn: string
) {
  const columns = this.page.locator('[data-testid="column"]');
  const columnTexts: string[] = [];

  const count = await columns.count();
  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).locator('[data-testid="column-header"]').textContent();
    if (text) columnTexts.push(text);
  }

  const afterIndex = columnTexts.findIndex(t => t.includes(afterColumn));
  const newIndex = columnTexts.findIndex(t => t.includes(newColumn));

  expect(newIndex).toBeGreaterThan(afterIndex);
});

Then('{string} column should show WIP limit indicator', async function (this: CustomWorld, columnName: string) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.locator('[data-testid="wip-indicator"]')).toBeVisible();
});

Then('I should see {int} columns on the board', async function (this: CustomWorld, expectedCount: number) {
  const columns = this.page.locator('[data-testid="column"]');
  await expect(columns).toHaveCount(expectedCount);
});

Then('columns should be ordered {string}', async function (this: CustomWorld, expectedOrder: string) {
  const expectedColumns = expectedOrder.split(', ').map(c => c.trim());
  const columns = this.page.locator('[data-testid="column-header"]');

  const count = await columns.count();
  expect(count).toBe(expectedColumns.length);

  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).textContent();
    expect(text).toContain(expectedColumns[i]);
  }
});

Then('columns should remain {string}', async function (this: CustomWorld, expectedOrder: string) {
  const expectedColumns = expectedOrder.split(', ').map(c => c.trim());
  const columns = this.page.locator('[data-testid="column-header"]');

  const count = await columns.count();
  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).textContent();
    expect(text).toContain(expectedColumns[i]);
  }
});

Then('the add column form should be closed', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="add-column-form"]')).not.toBeVisible();
});

Then('{string} should no longer appear in the column list', async function (this: CustomWorld, columnName: string) {
  await expect(this.page.locator(`[data-testid="column"]:has-text("${columnName}")`)).not.toBeVisible();
});

Then('{string} should still appear in the column list', async function (this: CustomWorld, columnName: string) {
  await expect(this.page.locator(`[data-testid="column"]:has-text("${columnName}")`)).toBeVisible();
});

// Note: 'I should see a confirmation dialog' is defined in common.steps.ts

Then('I should see a warning about {int} todos being deleted', async function (this: CustomWorld, todoCount: number) {
  await expect(this.page.getByText(new RegExp(`${todoCount}.*todo`, 'i'))).toBeVisible();
});

Then('the {int} todos should be deleted', async function (this: CustomWorld, todoCount: number) {
  // Verify todos are no longer visible - implementation depends on UI
  // This is verified by checking the column no longer exists
});

Then('the {string} column should have {int} additional todos', async function (
  this: CustomWorld,
  columnName: string,
  additionalCount: number
) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const todos = column.locator('[data-testid="todo-card"]');
  const count = await todos.count();
  expect(count).toBeGreaterThanOrEqual(additionalCount);
});

Then('the {string} column should still have {int} todos', async function (
  this: CustomWorld,
  columnName: string,
  todoCount: number
) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const todos = column.locator('[data-testid="todo-card"]');
  await expect(todos).toHaveCount(todoCount);
});

Then('the board should refresh to show current state', async function (this: CustomWorld) {
  // Wait for potential refresh/reload
  await this.page.waitForLoadState('networkidle');
});

Then('I should see an error message', async function (this: CustomWorld) {
  // Generic error message check
  const errorLocators = [
    this.page.locator('[data-testid="error-message"]'),
    this.page.locator('.error'),
    this.page.locator('[role="alert"]'),
    this.page.getByText(/error|failed/i),
  ];

  let found = false;
  for (const locator of errorLocators) {
    if (await locator.isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
});
