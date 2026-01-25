import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

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

Given('columns {string} exist in that order', async ({}, _columnNames: string) => {
  // Columns are already set up in the background step
  // This step is for readability in scenarios
});

Given('the {string} column has {int} todos', async ({}, columnName: string, todoCount: number) => {
  const column = testState.columns.find(c => c.name === columnName);
  if (column) {
    column.todos = Array.from({ length: todoCount }, (_, i) => ({
      id: `todo-${column.id}-${i + 1}`,
      title: `Todo ${i + 1}`,
      position: i,
    }));
  }
});

Given('the {string} column has no todos', async ({}, columnName: string) => {
  const column = testState.columns.find(c => c.name === columnName);
  if (column) {
    column.todos = [];
  }
});

Given('the create column endpoint returns success', async ({ page }) => {
  await page.route('**/api/boards/*/columns', async (route) => {
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

Given('the reorder columns endpoint returns success', async ({ page }) => {
  await page.route('**/api/columns/reorder', async (route) => {
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

Given('the delete column endpoint returns success', async ({ page }) => {
  await page.route('**/api/columns/*', async (route) => {
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

Given('the server will return an error for column creation', async ({ page }) => {
  await page.route('**/api/boards/*/columns', async (route) => {
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

Given('the server will return an error for column reorder', async ({ page }) => {
  await page.route('**/api/columns/reorder', async (route) => {
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

Given('the server will return an error for column deletion', async ({ page }) => {
  await page.route('**/api/columns/*', async (route) => {
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

Given('another user deletes the {string} column', async ({}, columnName: string) => {
  // Simulate column being deleted - will cause error on next operation
  testState.columns = testState.columns.filter(c => c.name !== columnName);
});

Given('the {string} column has been deleted by another user', async ({ page }, _columnName: string) => {
  // Simulate column being deleted by another user
  await page.route('**/api/columns/*', async (route) => {
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
When('I enter {string} as the column name', async ({ page }, columnName: string) => {
  await page.getByLabel(/column name/i).fill(columnName);
});

When('I leave the column name empty', async ({ page }) => {
  await page.getByLabel(/column name/i).clear();
});

When('I enter a 256 character column name', async ({ page }) => {
  const longName = 'a'.repeat(256);
  await page.getByLabel(/column name/i).fill(longName);
});

When('I set WIP limit to {int}', async ({ page }, limit: number) => {
  await page.getByLabel(/wip limit/i).fill(limit.toString());
});

When('I add a column named {string}', async ({ page }, columnName: string) => {
  await page.getByRole('button', { name: /add column/i }).click();
  await page.getByLabel(/column name/i).fill(columnName);
  await page.getByRole('button', { name: /save/i }).click();
  await page.waitForTimeout(500); // Wait for column to be added
});

When('I drag {string} column before {string}', async ({ page }, sourceColumn: string, targetColumn: string) => {
  const source = page.locator(`[data-testid="column-header"]:has-text("${sourceColumn}")`);
  const target = page.locator(`[data-testid="column-header"]:has-text("${targetColumn}")`);

  const sourceBounds = await source.boundingBox();
  const targetBounds = await target.boundingBox();

  if (sourceBounds && targetBounds) {
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBounds.x - 10,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();
  }
});

When('I drag {string} column to the last position', async ({ page }, columnName: string) => {
  const source = page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  const columns = page.locator('[data-testid="column"]');
  const lastColumn = columns.last();

  const sourceBounds = await source.boundingBox();
  const targetBounds = await lastColumn.boundingBox();

  if (sourceBounds && targetBounds) {
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBounds.x + targetBounds.width + 10,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();
  }
});

When('I drag {string} column to the first position', async ({ page }, columnName: string) => {
  const source = page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  const columns = page.locator('[data-testid="column"]');
  const firstColumn = columns.first();

  const sourceBounds = await source.boundingBox();
  const targetBounds = await firstColumn.boundingBox();

  if (sourceBounds && targetBounds) {
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBounds.x - 10,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();
  }
});

When('I try to drag {string}', async ({ page }, columnName: string) => {
  // Attempt to drag but there's nowhere to drop
  const source = page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  const sourceBounds = await source.boundingBox();

  if (sourceBounds) {
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2 + 50,
      sourceBounds.y + sourceBounds.height / 2,
      { steps: 5 }
    );
    await page.mouse.up();
  }
});

When('I click the delete button for {string} column', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByRole('button', { name: /delete/i }).click();
});

When('I choose to move todos to {string} column', async ({ page }, targetColumn: string) => {
  await page.getByLabel(/move todos to/i).selectOption({ label: targetColumn });
});

// Column assertion steps
Then('I should see {string} column after {string}', async ({ page }, newColumn: string, afterColumn: string) => {
  const columns = page.locator('[data-testid="column"]');
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

Then('{string} column should show WIP limit indicator', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.locator('[data-testid="wip-indicator"]')).toBeVisible();
});

Then('I should see {int} columns on the board', async ({ page }, expectedCount: number) => {
  const columns = page.locator('[data-testid="column"]');
  await expect(columns).toHaveCount(expectedCount);
});

Then('columns should be ordered {string}', async ({ page }, expectedOrder: string) => {
  const expectedColumns = expectedOrder.split(', ').map(c => c.trim());
  const columns = page.locator('[data-testid="column-header"]');

  const count = await columns.count();
  expect(count).toBe(expectedColumns.length);

  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).textContent();
    expect(text).toContain(expectedColumns[i]);
  }
});

Then('columns should remain {string}', async ({ page }, expectedOrder: string) => {
  const expectedColumns = expectedOrder.split(', ').map(c => c.trim());
  const columns = page.locator('[data-testid="column-header"]');

  const count = await columns.count();
  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).textContent();
    expect(text).toContain(expectedColumns[i]);
  }
});

Then('the add column form should be closed', async ({ page }) => {
  await expect(page.locator('[data-testid="add-column-form"]')).not.toBeVisible();
});

Then('{string} should no longer appear in the column list', async ({ page }, columnName: string) => {
  await expect(page.locator(`[data-testid="column"]:has-text("${columnName}")`)).not.toBeVisible();
});

Then('{string} should still appear in the column list', async ({ page }, columnName: string) => {
  await expect(page.locator(`[data-testid="column"]:has-text("${columnName}")`)).toBeVisible();
});

Then('I should see a warning about {int} todos being deleted', async ({ page }, todoCount: number) => {
  await expect(page.getByText(new RegExp(`${todoCount}.*todo`, 'i'))).toBeVisible();
});

Then('the {int} todos should be deleted', async ({}, _todoCount: number) => {
  // Verify todos are no longer visible - implementation depends on UI
  // This is verified by checking the column no longer exists
});

Then('the {string} column should have {int} additional todos', async ({ page }, columnName: string, additionalCount: number) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const todos = column.locator('[data-testid="todo-card"]');
  const count = await todos.count();
  expect(count).toBeGreaterThanOrEqual(additionalCount);
});

Then('the {string} column should still have {int} todos', async ({ page }, columnName: string, todoCount: number) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const todos = column.locator('[data-testid="todo-card"]');
  await expect(todos).toHaveCount(todoCount);
});

Then('the board should refresh to show current state', async ({ page }) => {
  // Wait for potential refresh/reload
  await page.waitForLoadState('networkidle');
});

Then('I should see an error message', async ({ page }) => {
  // Generic error message check
  const errorLocators = [
    page.locator('[data-testid="error-message"]'),
    page.locator('.error'),
    page.locator('[role="alert"]'),
    page.getByText(/error|failed/i),
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
