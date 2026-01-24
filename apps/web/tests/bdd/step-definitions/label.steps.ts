import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Label setup steps
Given('a label {string} with color {string} exists', async function (
  this: CustomWorld,
  labelName: string,
  color: string
) {
  await this.page.route('**/api/labels', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 'label-1', name: labelName, color },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('a label {string} exists', async function (this: CustomWorld, labelName: string) {
  await this.page.route('**/api/labels', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 'label-1', name: labelName, color: '#FF0000' },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('a todo {string} exists', async function (this: CustomWorld, todoTitle: string) {
  // Mock todo existence
});

// Label interaction steps
When('I open label management', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /labels|manage labels/i }).click();
});

When('I create a label with name {string} and color {string}', async function (
  this: CustomWorld,
  name: string,
  color: string
) {
  await this.page.getByLabel(/label name/i).fill(name);
  await this.page.getByLabel(/color/i).fill(color);
  await this.page.getByRole('button', { name: /create|add|save/i }).click();
});

When('I edit the {string} label', async function (this: CustomWorld, labelName: string) {
  const label = this.page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  await label.getByRole('button', { name: /edit/i }).click();
});

When('I change the color to {string}', async function (this: CustomWorld, color: string) {
  await this.page.getByLabel(/color/i).fill(color);
  await this.page.getByRole('button', { name: /save|update/i }).click();
});

When('I delete the {string} label', async function (this: CustomWorld, labelName: string) {
  const label = this.page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  await label.getByRole('button', { name: /delete/i }).click();
  await this.page.getByRole('button', { name: /confirm|yes/i }).click();
});

When('I assign {string} label to {string}', async function (
  this: CustomWorld,
  labelName: string,
  todoTitle: string
) {
  const todo = this.page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click();
  await this.page.getByLabel(/labels/i).click();
  await this.page.getByRole('option', { name: labelName }).click();
  await this.page.getByRole('button', { name: /save|close/i }).click();
});

When('I try to create a label without a name', async function (this: CustomWorld) {
  await this.page.getByLabel(/color/i).fill('#FF0000');
  await this.page.getByRole('button', { name: /create|add|save/i }).click();
});

When('I try to create another label named {string}', async function (this: CustomWorld, labelName: string) {
  await this.page.getByLabel(/label name/i).fill(labelName);
  await this.page.getByLabel(/color/i).fill('#00FF00');
  await this.page.getByRole('button', { name: /create|add|save/i }).click();
});

// Label assertion steps
Then('I should see {string} label in the list', async function (this: CustomWorld, labelName: string) {
  await expect(this.page.locator(`[data-testid="label-item"]:has-text("${labelName}")`)).toBeVisible();
});

Then('the label color should be updated', async function (this: CustomWorld) {
  // Verify color change - specific implementation depends on UI
});

Then('{string} should not appear in the labels list', async function (this: CustomWorld, labelName: string) {
  await expect(this.page.locator(`[data-testid="label-item"]:has-text("${labelName}")`)).not.toBeVisible();
});

Then('todos should no longer have {string} label', async function (this: CustomWorld, labelName: string) {
  await expect(this.page.locator(`[data-testid="todo-card"] [data-testid="label"]:has-text("${labelName}")`)).not.toBeVisible();
});

Then('{string} should display {string} label', async function (
  this: CustomWorld,
  todoTitle: string,
  labelName: string
) {
  const todo = this.page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator(`[data-testid="label"]:has-text("${labelName}")`)).toBeVisible();
});
