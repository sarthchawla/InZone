import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Column setup steps
Given('I am viewing a board with columns {string}', async function (this: CustomWorld, columnNames: string) {
  const columns = columnNames.split(', ').map((name, index) => ({
    id: `col-${index + 1}`,
    name: name.trim(),
    position: index,
    todos: [],
  }));

  // Mock API to return board with specified columns
  await this.page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-board-1',
          name: 'Test Board',
          columns,
        }),
      });
    } else {
      await route.continue();
    }
  });

  await this.page.goto(`${this.baseUrl}/boards/test-board-1`);
  await this.page.waitForLoadState('networkidle');
});

Given('columns {string} exist in that order', async function (this: CustomWorld, columnNames: string) {
  // Columns are already set up in the background step
});

// Column interaction steps
When('I click "Add column"', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /add column/i }).click();
});

When('I enter {string} as the column name', async function (this: CustomWorld, columnName: string) {
  await this.page.getByLabel(/column name/i).fill(columnName);
});

When('I leave the column name empty', async function (this: CustomWorld) {
  await this.page.getByLabel(/column name/i).clear();
});

When('I set WIP limit to {int}', async function (this: CustomWorld, limit: number) {
  await this.page.getByLabel(/wip limit/i).fill(limit.toString());
});

When('I drag {string} column before {string}', async function (
  this: CustomWorld,
  sourceColumn: string,
  targetColumn: string
) {
  const source = this.page.locator(`[data-testid="column-header"]:has-text("${sourceColumn}")`);
  const target = this.page.locator(`[data-testid="column-header"]:has-text("${targetColumn}")`);

  await source.dragTo(target);
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

Then('columns should be ordered {string}', async function (this: CustomWorld, expectedOrder: string) {
  const expectedColumns = expectedOrder.split(', ').map(c => c.trim());
  const columns = this.page.locator('[data-testid="column-header"]');

  const count = await columns.count();
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
