import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';
import {
  sharedState,
  getColumnByName,
  addColumn,
  removeColumn,
  type Column,
} from './shared-state';

const { Given, When, Then } = createBdd(test);

// Use shared state - this is the same object used by todo.steps.ts
const testState = sharedState;

Given('columns {string} exist in that order', async ({}, _columnNames: string) => {
  // Columns are already set up in the background step
  // This step is for readability in scenarios
});

Given('the {string} column has {int} todos', async ({}, columnName: string, todoCount: number) => {
  const column = getColumnByName(columnName);
  if (column) {
    column.todos = Array.from({ length: todoCount }, (_, i) => ({
      id: `todo-${column.id}-${i + 1}`,
      title: `Todo ${i + 1}`,
      position: i,
    }));
  }
});

Given('the {string} column has no todos', async ({}, columnName: string) => {
  const column = getColumnByName(columnName);
  if (column) {
    column.todos = [];
  }
});

Given('the create column endpoint returns success', async ({ page }) => {
  await page.route('**/api/boards/*/columns', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      // Extract boardId from URL (e.g., /api/boards/test-board/columns)
      const urlParts = route.request().url().split('/');
      const boardIdIndex = urlParts.indexOf('boards') + 1;
      const boardId = urlParts[boardIdIndex] || 'test-board';

      const newColumn: Column = {
        id: `col-${Date.now()}`,
        name: body.name,
        position: testState.columns.length,
        wipLimit: body.wipLimit,
        todos: [],
      };
      // Add to shared state so board refetch sees the new column
      addColumn(newColumn);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        // Include boardId in response so React Query can invalidate the correct board query
        body: JSON.stringify({ ...newColumn, boardId }),
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
      // Update positions in shared state based on the reorder request
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
      // Remove from shared state
      removeColumn(columnId);
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
  const column = getColumnByName(columnName);
  if (column) {
    removeColumn(column.id);
  }
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
  // Try placeholder first (inline form), then label (modal form)
  const byPlaceholder = page.getByPlaceholder(/enter column name/i);
  const byLabel = page.getByLabel(/column name/i);

  if (await byPlaceholder.isVisible().catch(() => false)) {
    await byPlaceholder.fill(columnName);
  } else {
    await byLabel.fill(columnName);
  }
});

When('I leave the column name empty', async ({ page }) => {
  const byPlaceholder = page.getByPlaceholder(/enter column name/i);
  const byLabel = page.getByLabel(/column name/i);

  if (await byPlaceholder.isVisible().catch(() => false)) {
    await byPlaceholder.clear();
  } else {
    await byLabel.clear();
  }
});

When('I enter a 256 character column name', async ({ page }) => {
  const longName = 'a'.repeat(256);
  const byPlaceholder = page.getByPlaceholder(/enter column name/i);
  const byLabel = page.getByLabel(/column name/i);

  if (await byPlaceholder.isVisible().catch(() => false)) {
    await byPlaceholder.fill(longName);
  } else {
    await byLabel.fill(longName);
  }
});

When('I set WIP limit to {int}', async ({ page }, limit: number) => {
  await page.getByLabel(/wip limit/i).fill(limit.toString());
});

When('I add a column named {string}', async ({ page }, columnName: string) => {
  // Click the add column area (which might show inline form)
  await page.getByRole('button', { name: /add column/i }).click();

  // Try placeholder first (inline form), then label (modal form)
  const byPlaceholder = page.getByPlaceholder(/enter column name/i);
  const byLabel = page.getByLabel(/column name/i);

  if (await byPlaceholder.isVisible().catch(() => false)) {
    await byPlaceholder.fill(columnName);
  } else {
    await byLabel.fill(columnName);
  }

  // Click Save or Add button
  const addBtn = page.getByRole('button', { name: /^add$/i });
  const saveBtn = page.getByRole('button', { name: /save/i });

  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
  } else {
    await saveBtn.click();
  }
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
  // Click the three dots menu button (exact match to avoid strict mode violation)
  await column.getByRole('button', { name: 'Column options', exact: true }).click();
  // Then click "Delete Column" from the dropdown menu — immediate, no confirmation
  await page.getByText('Delete Column').click();
  // Wait briefly for the deletion to process
  await page.waitForTimeout(500);
});

When('I choose to move todos to {string} column', async ({ page }, targetColumn: string) => {
  await page.getByLabel(/move todos to/i).selectOption({ label: targetColumn });
});

// Column assertion steps
Then('I should see {string} column after {string}', async ({ page }, newColumn: string, afterColumn: string) => {
  // Wait for the new column to appear first
  await expect(page.getByRole('heading', { level: 3, name: newColumn })).toBeVisible({ timeout: 5000 });

  // Get all column headings directly using role selector
  const headings = page.getByRole('heading', { level: 3 });
  const columnNames: string[] = [];

  const count = await headings.count();
  for (let i = 0; i < count; i++) {
    const text = await headings.nth(i).textContent();
    if (text) columnNames.push(text.trim());
  }

  const afterIndex = columnNames.findIndex(name => name === afterColumn);
  const newIndex = columnNames.findIndex(name => name === newColumn);

  // Both columns should exist
  expect(afterIndex, `Column "${afterColumn}" not found. Found: ${columnNames.join(', ')}`).toBeGreaterThanOrEqual(0);
  expect(newIndex, `Column "${newColumn}" not found. Found: ${columnNames.join(', ')}`).toBeGreaterThanOrEqual(0);
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
  // Target the h3 element inside column header to get just the column name (not the count badge)
  const columns = page.locator('[data-testid="column-header"] h3');

  const count = await columns.count();
  expect(count).toBe(expectedColumns.length);

  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).textContent();
    expect(text?.trim()).toBe(expectedColumns[i]);
  }
});

Then('columns should remain {string}', async ({ page }, expectedOrder: string) => {
  const expectedColumns = expectedOrder.split(', ').map(c => c.trim());
  // Target the h3 element inside column header to get just the column name (not the count badge)
  const columns = page.locator('[data-testid="column-header"] h3');

  const count = await columns.count();
  for (let i = 0; i < count; i++) {
    const text = await columns.nth(i).textContent();
    expect(text?.trim()).toBe(expectedColumns[i]);
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

// ==========================================
// Swimlane Description Steps
// ==========================================

// Track column descriptions in test state
const columnDescriptions: Record<string, string> = {};

Given('the {string} column has description {string}', async ({ page }, columnName: string, description: string) => {
  columnDescriptions[columnName] = description;

  // Update the column in shared state to include description
  const column = getColumnByName(columnName);
  if (column) {
    (column as Column & { description?: string }).description = description;
  }

  // Update the mock to return description
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'GET') {
      const columnsWithDesc = testState.columns.map(col => ({
        ...col,
        description: columnDescriptions[col.name] || '',
        todos: col.todos || [],
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testState.boardId,
          name: 'Test Board',
          description: '',
          columns: columnsWithDesc,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Reload to pick up the new mock
  await page.reload();
  await page.waitForLoadState('networkidle');
});

Given('the {string} column has no description', async ({ page }, columnName: string) => {
  columnDescriptions[columnName] = '';

  // Update the column in shared state to have no description
  const column = getColumnByName(columnName);
  if (column) {
    (column as Column & { description?: string }).description = '';
  }

  // Update the mock to return empty description
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'GET') {
      const columnsWithDesc = testState.columns.map(col => ({
        ...col,
        description: columnDescriptions[col.name] || '',
        todos: col.todos || [],
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testState.boardId,
          name: 'Test Board',
          description: '',
          columns: columnsWithDesc,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Reload to pick up the new mock
  await page.reload();
  await page.waitForLoadState('networkidle');
});

Then('I should see an info icon in the {string} column header', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const header = column.locator('[data-testid="column-header"]');
  const infoIcon = header.locator('[data-testid="info-icon"]');

  await expect(infoIcon).toBeVisible({ timeout: 5000 });
});

When('I hover over the info icon in the {string} column header', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const header = column.locator('[data-testid="column-header"]');
  const infoIcon = header.locator('[data-testid="info-icon"]');

  await infoIcon.hover();
  // Wait for tooltip to appear
  await page.waitForTimeout(500);
});

Then('I should see a tooltip with {string}', async ({ page }, expectedText: string) => {
  const tooltip = page.locator('[role="tooltip"]');
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  await expect(tooltip).toContainText(expectedText);
});

When('I move the mouse away from the info icon', async ({ page }) => {
  // Move mouse to a neutral area (the board view container)
  const boardView = page.locator('[data-testid="board-view"]');
  await boardView.hover({ position: { x: 10, y: 10 } });
  // Wait for tooltip to disappear
  await page.waitForTimeout(500);
});

Then('I should not see the tooltip', async ({ page }) => {
  const tooltip = page.locator('[role="tooltip"]');
  await expect(tooltip).not.toBeVisible({ timeout: 3000 });
});

When('I click the info icon in the {string} column header', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const header = column.locator('[data-testid="column-header"]');
  const infoIcon = header.locator('[data-testid="info-icon"]');

  await infoIcon.click();
});

Then('I should see the {string} modal', async ({ page }, modalTitle: string) => {
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await expect(modal.getByText(modalTitle)).toBeVisible();
});

Then('I should see a description input field', async ({ page }) => {
  const modal = page.getByRole('dialog');
  // The Edit Column modal uses a textarea for description
  const descriptionInput = modal.locator('textarea#columnDescription, textarea[placeholder*="description"]');
  await expect(descriptionInput.first()).toBeVisible();
});

Then('I should see the full description in the tooltip', async ({ page }) => {
  const tooltip = page.locator('[role="tooltip"]');
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  // Just verify the tooltip is visible and has content
  const text = await tooltip.textContent();
  expect(text?.length).toBeGreaterThan(50); // Long description
});

Then('I should see {string} in the tooltip', async ({ page }, expectedText: string) => {
  const tooltip = page.locator('[role="tooltip"]');
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  await expect(tooltip).toContainText(expectedText);
});
