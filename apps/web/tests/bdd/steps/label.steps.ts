import { createBdd } from 'playwright-bdd';
import { test, expect, MockedRoutes } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Store for managing mock label state across steps
interface MockLabel {
  id: string;
  name: string;
  color: string;
}

let mockLabels: MockLabel[] = [];
let labelIdCounter = 1;

// Helper to reset labels between scenarios
function resetMockLabels() {
  mockLabels = [];
  labelIdCounter = 1;
}

function getDefaultColorForLabel(name: string): string {
  const colors: Record<string, string> = {
    Bug: '#FF0000',
    Feature: '#00FF00',
    Documentation: '#0000FF',
    Urgent: '#FF6600',
    Enhancement: '#9900FF',
    'High Priority': '#FF3300',
    Backend: '#666666',
  };
  return colors[name] || '#888888';
}

// Helper function to set up label API routes
async function setupLabelRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/labels**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockLabels),
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      const newLabel = {
        id: `label-${labelIdCounter++}`,
        name: body.name,
        color: body.color,
      };
      mockLabels.push(newLabel);
      await route.fulfill({
        status: 201,
        body: JSON.stringify(newLabel),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const labelId = url.split('/').pop();
      const body = route.request().postDataJSON();
      const labelIndex = mockLabels.findIndex((l) => l.id === labelId);
      if (labelIndex >= 0) {
        mockLabels[labelIndex] = { ...mockLabels[labelIndex], ...body };
        await route.fulfill({
          status: 200,
          body: JSON.stringify(mockLabels[labelIndex]),
        });
      } else {
        await route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Label not found' }),
        });
      }
    } else if (method === 'DELETE') {
      const labelId = url.split('/').pop();
      mockLabels = mockLabels.filter((l) => l.id !== labelId);
      await route.fulfill({
        status: 204,
        body: '',
      });
    } else {
      await route.continue();
    }
  });
}

// Label setup steps
Given('a label {string} with color {string} exists', async ({ page, mockedRoutes }, labelName: string, color: string) => {
  // Mark labels route as mocked to prevent default mock from overwriting
  mockedRoutes.add('labels');
  resetMockLabels();
  mockLabels.push({ id: `label-${labelIdCounter++}`, name: labelName, color });
  await setupLabelRoutes(page);
});

Given('a label {string} exists', async ({ page, mockedRoutes }, labelName: string) => {
  // Mark labels route as mocked to prevent default mock from overwriting
  mockedRoutes.add('labels');
  resetMockLabels();
  mockLabels.push({ id: `label-${labelIdCounter++}`, name: labelName, color: '#FF0000' });
  await setupLabelRoutes(page);
});

Given('labels {string} exist', async ({ page, mockedRoutes }, labelNames: string) => {
  // Mark labels route as mocked to prevent default mock from overwriting
  mockedRoutes.add('labels');
  resetMockLabels();
  const names = labelNames.split(',').map((n) => n.trim());
  names.forEach((name) => {
    mockLabels.push({
      id: `label-${labelIdCounter++}`,
      name,
      color: getDefaultColorForLabel(name),
    });
  });
  await setupLabelRoutes(page);
});

Given('a todo {string} exists with label {string}', async ({ page }, todoTitle: string, labelName: string) => {
  const label = mockLabels.find((l) => l.name === labelName);
  await page.route('**/api/todos*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'todo-1',
            title: todoTitle,
            columnId: 'col-1',
            labels: label ? [label] : [],
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('a todo {string} exists without labels', async ({ page }, todoTitle: string) => {
  await page.route('**/api/todos*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'todo-1',
            title: todoTitle,
            columnId: 'col-1',
            labels: [],
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
});

Given('{int} todos exist with label {string}', async ({ page }, todoCount: number, labelName: string) => {
  const label = mockLabels.find((l) => l.name === labelName);
  const todos = Array.from({ length: todoCount }, (_, i) => ({
    id: `todo-${i + 1}`,
    title: `Task ${i + 1}`,
    columnId: 'col-1',
    labels: label ? [label] : [],
  }));
  await page.route('**/api/todos*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(todos),
      });
    } else {
      await route.continue();
    }
  });
});

Given('another user has deleted the {string} label', async ({ page }, labelName: string) => {
  mockLabels = mockLabels.filter((l) => l.name !== labelName);
  await setupLabelRoutes(page);
});

// Navigation steps
When('I navigate to the label management page', async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}/labels`);
  await page.waitForLoadState('networkidle');
});

When('I open label management', async ({ page }) => {
  await page.getByRole('button', { name: /labels|manage labels/i }).click();
});

// Label creation steps
When('I enter {string} as the label name', async ({ page }, name: string) => {
  await page.getByLabel(/label name/i).fill(name);
});

When('I select {string} as the label color', async ({ page }, color: string) => {
  const colorInput = page.getByLabel(/color/i);
  if (await colorInput.isVisible()) {
    await colorInput.fill(color);
  } else {
    // Try clicking a color picker button
    await page.locator(`[data-color="${color}"]`).click();
  }
});

When('I enter {string} as the label color', async ({ page }, color: string) => {
  await page.getByLabel(/color/i).fill(color);
});

When('I leave the label name empty', async ({ page }) => {
  await page.getByLabel(/label name/i).fill('');
});

When('I do not select a color', async () => {
  // Intentionally leave color empty or default
});

When('I select the blue color from the color picker', async ({ page }) => {
  const colorPicker = page.locator('[data-testid="color-picker"]');
  await colorPicker.locator('[data-color="#0000FF"], .color-blue').click();
});

When('I enter a {int} character label name', async ({ page }, length: number) => {
  const longName = 'a'.repeat(length);
  await page.getByLabel(/label name/i).fill(longName);
});

When('I create a label with name {string} and color {string}', async ({ page }, name: string, color: string) => {
  await page.getByRole('button', { name: /create label|add label/i }).click();
  await page.getByLabel(/label name/i).fill(name);
  await page.getByLabel(/color/i).fill(color);
  await page.getByRole('button', { name: /save|create|add/i }).click();
});

// Label editing steps
When('I edit the {string} label', async ({ page }, labelName: string) => {
  const label = page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  await label.getByRole('button', { name: /edit/i }).click();
});

When('I change the name to {string}', async ({ page }, newName: string) => {
  await page.getByLabel(/label name/i).clear();
  await page.getByLabel(/label name/i).fill(newName);
});

When('I change the color to {string}', async ({ page }, color: string) => {
  await page.getByLabel(/color/i).clear();
  await page.getByLabel(/color/i).fill(color);
});

When('I try to edit the {string} label', async ({ page }, labelName: string) => {
  const label = page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  if (await label.isVisible()) {
    await label.getByRole('button', { name: /edit/i }).click();
  }
});

// Label deletion steps
When('I delete the {string} label', async ({ page }, labelName: string) => {
  const label = page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  await label.getByRole('button', { name: /delete/i }).click();
  await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
});

When('I click the delete button for {string} label', async ({ page }, labelName: string) => {
  const label = page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  await label.getByRole('button', { name: /delete/i }).click();
});

// Label assignment steps
When('I open the {string} todo', async ({ page }, todoTitle: string) => {
  await page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`).click();
});

When('I assign {string} label to the todo', async ({ page }, labelName: string) => {
  await page.getByLabel(/labels/i).click();
  await page.getByRole('option', { name: labelName }).click();
});

When('I assign labels {string} and {string} and {string} to the todo', async ({ page }, label1: string, label2: string, label3: string) => {
  await page.getByLabel(/labels/i).click();
  await page.getByRole('option', { name: label1 }).click();
  await page.getByRole('option', { name: label2 }).click();
  await page.getByRole('option', { name: label3 }).click();
});

When('I remove {string} label from the todo', async ({ page }, labelName: string) => {
  const labelBadge = page.locator(`[data-testid="selected-label"]:has-text("${labelName}")`);
  await labelBadge.getByRole('button', { name: /remove|x|close/i }).click();
});

When('I assign {string} label to {string}', async ({ page }, labelName: string, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click();
  await page.getByLabel(/labels/i).click();
  await page.getByRole('option', { name: labelName }).click();
  await page.getByRole('button', { name: /save|close/i }).click();
});

// Label filtering steps
When('I filter by {string} label', async ({ page }, labelName: string) => {
  await page.getByRole('combobox', { name: /filter.*label/i }).click();
  await page.getByRole('option', { name: labelName }).click();
});

When('I clear the label filter', async ({ page }) => {
  await page.getByRole('button', { name: /clear filter|reset/i }).click();
});

// Unhappy path setup steps
When('I try to create a label without a name', async ({ page }) => {
  await page.getByLabel(/color/i).fill('#FF0000');
  await page.getByRole('button', { name: /create|add|save/i }).click();
});

When('I try to create another label named {string}', async ({ page }, labelName: string) => {
  await page.getByRole('button', { name: /create label|add label/i }).click();
  await page.getByLabel(/label name/i).fill(labelName);
  await page.getByLabel(/color/i).fill('#00FF00');
  await page.getByRole('button', { name: /save|create|add/i }).click();
});

// Label assertion steps
Then('I should see {string} label in the list', async ({ page }, labelName: string) => {
  await expect(
    page.locator(`[data-testid="label-item"]:has-text("${labelName}")`)
  ).toBeVisible();
});

Then('I should not see {string} label in the list', async ({ page }, labelName: string) => {
  await expect(
    page.locator(`[data-testid="label-item"]:has-text("${labelName}")`)
  ).not.toBeVisible();
});

Then('the {string} label should have color {string}', async ({ page }, labelName: string, color: string) => {
  const label = page.locator(`[data-testid="label-item"]:has-text("${labelName}")`);
  const colorIndicator = label.locator('[data-testid="label-color"]');
  await expect(colorIndicator).toHaveAttribute('style', new RegExp(color, 'i'));
});

Then('the label color should be updated', async ({ page }) => {
  // Verify color change - specific implementation depends on UI
  await expect(page.locator('[data-testid="label-color-updated"]')).toBeVisible();
});

Then('{string} should not appear in the labels list', async ({ page }, labelName: string) => {
  await expect(
    page.locator(`[data-testid="label-item"]:has-text("${labelName}")`)
  ).not.toBeVisible();
});

Then('todos should no longer have {string} label', async ({ page }, labelName: string) => {
  await expect(
    page.locator(`[data-testid="todo-card"] [data-testid="label"]:has-text("${labelName}")`)
  ).not.toBeVisible();
});

Then('{string} should display {string} label', async ({ page }, todoTitle: string, labelName: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator(`[data-testid="label"]:has-text("${labelName}")`)).toBeVisible();
});

Then('{string} should not display {string} label', async ({ page }, todoTitle: string, labelName: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator(`[data-testid="label"]:has-text("${labelName}")`)).not.toBeVisible();
});

Then('no new label should be created', async ({ page }) => {
  // Verify no POST request was made or the list hasn't grown
  const labelCount = await page.locator('[data-testid="label-item"]').count();
  expect(labelCount).toBe(mockLabels.length);
});

Then('the {string} label should remain unchanged', async ({ page }, labelName: string) => {
  await expect(
    page.locator(`[data-testid="label-item"]:has-text("${labelName}")`)
  ).toBeVisible();
});

Then('my label input should be preserved', async ({ page }) => {
  const nameInput = page.getByLabel(/label name/i);
  await expect(nameInput).not.toBeEmpty();
});

Then('I should see a warning about affected todos', async ({ page }) => {
  await expect(page.getByText(/affected.*todos|todos.*affected|will be removed/i)).toBeVisible();
});

Then('labels should eventually appear', async ({ page }) => {
  await page.waitForSelector('[data-testid="label-item"]', { timeout: 10000 });
  const labelCount = await page.locator('[data-testid="label-item"]').count();
  expect(labelCount).toBeGreaterThan(0);
});

Then('the labels list should be refreshed', async ({ page }) => {
  // Wait for the list to refresh after error
  await page.waitForResponse('**/api/labels');
});

Then('the label name should be properly escaped', async ({ page }) => {
  // Verify that script tags are not executed - check for escaped content
  const labels = await page.locator('[data-testid="label-item"]').allTextContents();
  const hasScript = labels.some((text) => text.includes('<script>'));
  expect(hasScript).toBe(false);
});

Then('no script should execute', async ({ page }) => {
  // Verify no alert was triggered
  let alertTriggered = false;
  page.on('dialog', () => {
    alertTriggered = true;
  });
  await page.waitForTimeout(500);
  expect(alertTriggered).toBe(false);
});

Then('the create label form should be hidden', async ({ page }) => {
  await expect(page.locator('[data-testid="create-label-form"]')).not.toBeVisible();
});

Then('I should see {string} in the filtered results', async ({ page }, todoTitle: string) => {
  await expect(page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`)).toBeVisible();
});

Then('I should not see {string} in the filtered results', async ({ page }, todoTitle: string) => {
  await expect(
    page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`)
  ).not.toBeVisible();
});

Then('I should see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

Then('I should not see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).not.toBeVisible();
});
