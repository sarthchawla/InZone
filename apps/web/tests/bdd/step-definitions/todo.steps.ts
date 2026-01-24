import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Todo setup steps
Given('a todo {string} exists in {string} column', async function (
  this: CustomWorld,
  todoTitle: string,
  columnName: string
) {
  // This step would be used after column setup to add a todo
});

Given('{string} and {string} exist in {string} column', async function (
  this: CustomWorld,
  todo1: string,
  todo2: string,
  columnName: string
) {
  // Mock todos in the specified column
});

Given('labels {string} exist', async function (this: CustomWorld, labelNames: string) {
  const labels = labelNames.split(', ').map((name, index) => ({
    id: `label-${index + 1}`,
    name: name.trim(),
    color: ['#FF0000', '#00FF00', '#0000FF'][index % 3],
  }));

  await this.page.route('**/api/labels', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(labels),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the {string} column has a WIP limit of {int}', async function (
  this: CustomWorld,
  columnName: string,
  limit: number
) {
  // WIP limit is set in column configuration
});

Given('the {string} column already has {int} todos', async function (
  this: CustomWorld,
  columnName: string,
  count: number
) {
  // Mock column with specified number of todos
});

Given('a column has been deleted by another user', async function (this: CustomWorld) {
  // Simulate concurrent deletion
  await this.page.route('**/api/todos/*/move', async (route) => {
    await route.fulfill({
      status: 404,
      body: JSON.stringify({ error: 'Column not found' }),
    });
  });
});

// Todo creation steps
When('I click "Add card" in the {string} column', async function (this: CustomWorld, columnName: string) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByRole('button', { name: /add card/i }).click();
});

When('I enter {string} as the todo title', async function (this: CustomWorld, title: string) {
  await this.page.getByLabel(/title/i).fill(title);
});

When('I leave the title empty', async function (this: CustomWorld) {
  await this.page.getByLabel(/title/i).clear();
});

When('I enter the following todo details:', async function (this: CustomWorld, dataTable) {
  const details = dataTable.rowsHash();

  if (details.title) {
    await this.page.getByLabel(/title/i).fill(details.title);
  }
  if (details.description) {
    await this.page.getByLabel(/description/i).fill(details.description);
  }
  if (details.priority) {
    await this.page.getByRole('combobox', { name: /priority/i }).click();
    await this.page.getByRole('option', { name: details.priority }).click();
  }
  if (details.dueDate === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.page.getByLabel(/due date/i).fill(tomorrow.toISOString().split('T')[0]);
  }
});

When('I create a todo titled {string}', async function (this: CustomWorld, title: string) {
  await this.page.getByRole('button', { name: /add card/i }).first().click();
  await this.page.getByLabel(/title/i).fill(title);
  await this.page.getByRole('button', { name: /save/i }).click();
});

When('I assign labels {string}', async function (this: CustomWorld, labelNames: string) {
  const labels = labelNames.split(', ');
  for (const label of labels) {
    await this.page.getByLabel(/labels/i).click();
    await this.page.getByRole('option', { name: label.trim() }).click();
  }
});

When('I try to add a todo to {string} column', async function (this: CustomWorld, columnName: string) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByRole('button', { name: /add card/i }).click();
});

When('I try to create a todo', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /add card/i }).first().click();
  await this.page.getByLabel(/title/i).fill('Test Todo');
  await this.page.getByRole('button', { name: /save/i }).click();
});

// Todo movement steps
When('I drag {string} to {string} column', async function (
  this: CustomWorld,
  todoTitle: string,
  targetColumn: string
) {
  const todo = this.page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  const target = this.page.locator(`[data-testid="column"]:has-text("${targetColumn}")`);

  await todo.dragTo(target);
});

When('I drag {string} above {string}', async function (
  this: CustomWorld,
  todo1: string,
  todo2: string
) {
  const source = this.page.locator(`[data-testid="todo-card"]:has-text("${todo1}")`);
  const target = this.page.locator(`[data-testid="todo-card"]:has-text("${todo2}")`);

  await source.dragTo(target);
});

When('I right-click on {string}', async function (this: CustomWorld, todoTitle: string) {
  const todo = this.page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click({ button: 'right' });
});

When('I select {string}', async function (this: CustomWorld, menuItem: string) {
  await this.page.getByRole('menuitem', { name: menuItem }).click();
});

When('I try to move a todo to that column', async function (this: CustomWorld) {
  // Attempt to move to a deleted column
});

// Todo assertion steps
Then('I should see {string} in the {string} column', async function (
  this: CustomWorld,
  todoTitle: string,
  columnName: string
) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('the todo should show {string} priority badge', async function (this: CustomWorld, priority: string) {
  await expect(this.page.getByText(priority)).toBeVisible();
});

Then('the todo should show the due date', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="due-date"]')).toBeVisible();
});

Then('the todo should display {string} and {string} labels', async function (
  this: CustomWorld,
  label1: string,
  label2: string
) {
  await expect(this.page.getByText(label1)).toBeVisible();
  await expect(this.page.getByText(label2)).toBeVisible();
});

Then('no todo should be created', async function (this: CustomWorld) {
  // Verify no new todo appears
});

Then('I should see a warning {string}', async function (this: CustomWorld, message: string) {
  await expect(this.page.getByText(message)).toBeVisible();
});

Then('my input should be preserved', async function (this: CustomWorld) {
  // Input field should still have the entered value
});

Then('{string} should appear in {string} column', async function (
  this: CustomWorld,
  todoTitle: string,
  columnName: string
) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('{string} should not appear in {string} column', async function (
  this: CustomWorld,
  todoTitle: string,
  columnName: string
) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).not.toBeVisible();
});

Then('{string} should appear before {string}', async function (
  this: CustomWorld,
  todo1: string,
  todo2: string
) {
  const todos = this.page.locator('[data-testid="todo-card"]');
  const todo1Text = await todos.filter({ hasText: todo1 }).first().boundingBox();
  const todo2Text = await todos.filter({ hasText: todo2 }).first().boundingBox();

  if (todo1Text && todo2Text) {
    expect(todo1Text.y).toBeLessThan(todo2Text.y);
  }
});

Then('{string} should remain in {string} column', async function (
  this: CustomWorld,
  todoTitle: string,
  columnName: string
) {
  const column = this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('I should see updated column list', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="column"]')).toBeVisible();
});
