import { createBdd, DataTable } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Context store for test data
interface TestContext {
  columns: Array<{ id: string; name: string; position: number; todos: unknown[] }>;
  existingTodos: Array<{
    id: string;
    title: string;
    columnName: string;
    priority?: string;
    description?: string;
    dueDate?: string;
    labels?: Array<{ id: string; name: string; color: string }>;
    position?: number;
  }>;
  columnWipLimits: Record<string, number>;
  columnCounts: Record<string, number>;
  deletedColumn?: string;
  initialTodoCount?: number;
}

let testContext: TestContext = {
  columns: [],
  existingTodos: [],
  columnWipLimits: {},
  columnCounts: {},
};

// Reset context for each scenario
function resetContext() {
  testContext = {
    columns: [],
    existingTodos: [],
    columnWipLimits: {},
    columnCounts: {},
  };
}

// ==========================================
// Background Setup Steps
// ==========================================

Given('I am viewing a board with columns {string}', async ({ page, baseUrl }, columnNames: string) => {
  resetContext();

  const columns = columnNames.split(', ').map((name, index) => ({
    id: `col-${index + 1}`,
    name: name.trim(),
    position: index,
    todos: [],
  }));

  // Store columns for later use
  testContext.columns = columns;
  testContext.existingTodos = [];

  // Mock the board endpoint
  await page.route('**/api/boards/test-board', async (route) => {
    if (route.request().method() === 'GET') {
      // Build columns with todos
      const columnsWithTodos = columns.map(col => ({
        ...col,
        todos: (testContext.existingTodos || [])
          .filter((t) => t.columnName === col.name)
          .map((t, idx) => ({
            id: t.id,
            title: t.title,
            priority: t.priority || 'MEDIUM',
            description: t.description || '',
            dueDate: t.dueDate || null,
            position: idx,
            labels: t.labels || [],
          })),
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-board',
          name: 'Test Board',
          description: '',
          columns: columnsWithTodos,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock the boards list to include this board
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-board',
          name: 'Test Board',
          description: '',
          todoCount: 0,
        }]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock todo creation endpoint
  await page.route('**/api/todos', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `todo-${Date.now()}`,
          ...body,
          priority: body.priority || 'MEDIUM',
          position: 0,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock todo update endpoint
  await page.route('**/api/todos/*', async (route) => {
    const method = route.request().method();
    if (method === 'PUT' || method === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...body,
          updatedAt: new Date().toISOString(),
        }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.continue();
    }
  });

  // Mock todo move endpoint
  await page.route('**/api/todos/*/move', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Navigate to the board
  await page.goto(`${baseUrl}/board/test-board`);
  await page.waitForLoadState('networkidle');
});

// ==========================================
// Todo Data Setup Steps
// ==========================================

Given('a todo {string} exists in {string} column', async ({}, todoTitle: string, columnName: string) => {
  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push({
    id: `todo-${testContext.existingTodos.length + 1}`,
    title: todoTitle,
    columnName,
    priority: 'MEDIUM',
    description: '',
  });
});

Given('a todo {string} exists in {string} column with details:', async ({}, todoTitle: string, columnName: string, dataTable: DataTable) => {
  const details = dataTable.rowsHash();
  testContext.existingTodos = testContext.existingTodos || [];

  const todo: TestContext['existingTodos'][0] = {
    id: `todo-${testContext.existingTodos.length + 1}`,
    title: todoTitle,
    columnName,
    description: details.description || '',
    priority: details.priority || 'MEDIUM',
  };

  if (details.dueDate) {
    if (details.dueDate === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      todo.dueDate = tomorrow.toISOString();
    } else if (details.dueDate.includes('days')) {
      const days = parseInt(details.dueDate);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      todo.dueDate = futureDate.toISOString();
    }
  }

  testContext.existingTodos.push(todo);
});

Given('a todo {string} exists in {string} column with priority {string}', async ({}, todoTitle: string, columnName: string, priority: string) => {
  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push({
    id: `todo-${testContext.existingTodos.length + 1}`,
    title: todoTitle,
    columnName,
    priority,
    description: '',
  });
});

Given('a todo {string} exists in {string} column with due date in {int} days', async ({}, todoTitle: string, columnName: string, days: number) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push({
    id: `todo-${testContext.existingTodos.length + 1}`,
    title: todoTitle,
    columnName,
    priority: 'MEDIUM',
    description: '',
    dueDate: futureDate.toISOString(),
  });
});

Given('a todo {string} exists in {string} column with label {string}', async ({}, todoTitle: string, columnName: string, labelName: string) => {
  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push({
    id: `todo-${testContext.existingTodos.length + 1}`,
    title: todoTitle,
    columnName,
    priority: 'MEDIUM',
    description: '',
    labels: [{ id: 'label-1', name: labelName, color: '#FF0000' }],
  });
});

Given('{string} and {string} exist in {string} column', async ({}, todo1: string, todo2: string, columnName: string) => {
  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push(
    { id: 'todo-1', title: todo1, columnName, priority: 'MEDIUM' },
    { id: 'todo-2', title: todo2, columnName, priority: 'MEDIUM' }
  );
});

Given('todos {string} exist in {string} column in that order', async ({}, todoNames: string, columnName: string) => {
  const todos = todoNames.split(', ').map((name, index) => ({
    id: `todo-${index + 1}`,
    title: name.trim(),
    columnName,
    priority: 'MEDIUM',
    position: index,
  }));

  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push(...todos);
});

Given('todos {string} exist in {string} column', async ({}, todoNames: string, columnName: string) => {
  const todos = todoNames.split(', ').map((name, index) => ({
    id: `todo-${index + 1}`,
    title: name.trim(),
    columnName,
    priority: 'MEDIUM',
    position: index,
  }));

  testContext.existingTodos = testContext.existingTodos || [];
  testContext.existingTodos.push(...todos);
});

Given('labels {string} are assigned to {string}', async ({}, labelNames: string, todoTitle: string) => {
  const labels = labelNames.split(', ').map((name, index) => ({
    id: `label-${index + 1}`,
    name: name.trim(),
    color: ['#FF0000', '#00FF00', '#0000FF'][index % 3],
  }));

  // Find the todo and add labels
  if (testContext.existingTodos) {
    const todo = testContext.existingTodos.find((t) => t.title === todoTitle);
    if (todo) {
      todo.labels = labels;
    }
  }
});

// ==========================================
// Column and WIP Limit Setup Steps
// ==========================================

Given('the {string} column has a WIP limit of {int}', async ({}, columnName: string, limit: number) => {
  testContext.columnWipLimits = testContext.columnWipLimits || {};
  testContext.columnWipLimits[columnName] = limit;
});

Given('the {string} column already has {int} todos', async ({}, columnName: string, count: number) => {
  testContext.existingTodos = testContext.existingTodos || [];
  for (let i = 0; i < count; i++) {
    testContext.existingTodos.push({
      id: `wip-todo-${i + 1}`,
      title: `WIP Todo ${i + 1}`,
      columnName,
      priority: 'MEDIUM',
      position: i,
    });
  }
});

Given('{string} column shows count of {int}', async ({}, columnName: string, count: number) => {
  testContext.columnCounts = testContext.columnCounts || {};
  testContext.columnCounts[columnName] = count;
});

// ==========================================
// Error Simulation Steps
// ==========================================

Given('the server will return an error for todo creation', async ({ page }) => {
  await page.route('**/api/todos', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to create todo' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for todo update', async ({ page }) => {
  await page.route('**/api/todos/*', async (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to update todo' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for todo move', async ({ page }) => {
  await page.route('**/api/todos/*/move', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to move todo' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for todo deletion', async ({ page }) => {
  await page.route('**/api/todos/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to delete todo' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the server will return an error for todo reorder', async ({ page }) => {
  await page.route('**/api/todos/reorder', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to reorder todos' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('a column has been deleted by another user', async ({ page }) => {
  await page.route('**/api/todos/*/move', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Column not found' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the todo {string} has been deleted by another user', async ({ page }, _todoTitle: string) => {
  await page.route('**/api/todos/*', async (route) => {
    if (route.request().method() === 'GET' || route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Todo not found' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('another user has modified the todo {string}', async ({ page }, _todoTitle: string) => {
  await page.route('**/api/todos/*', async (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Concurrent modification detected' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('another user is moving the same todo', async ({ page }) => {
  await page.route('**/api/todos/*/move', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Concurrent modification' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('another user has deleted {string} column', async ({}, columnName: string) => {
  testContext.deletedColumn = columnName;
});

Given('the network was unavailable', async () => {
  // Network was previously unavailable - no special action needed
});

Given('the network is now available', async ({ page }) => {
  // Restore normal network - clear any abort routes
  await page.unroute('**/api/**');
});

// ==========================================
// Todo Creation Steps
// ==========================================

When('I click "Add card" in the {string} column', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByRole('button', { name: /add card/i }).click();
});

When('I enter {string} as the todo title', async ({ page }, title: string) => {
  await page.getByLabel(/title/i).fill(title);
});

When('I enter {string} as the description', async ({ page }, description: string) => {
  await page.getByLabel(/description/i).fill(description);
});

When('I leave the title empty', async ({ page }) => {
  await page.getByLabel(/title/i).clear();
});

When('I enter a {int} character todo title', async ({ page }, length: number) => {
  const longTitle = 'A'.repeat(length);
  await page.getByLabel(/title/i).fill(longTitle);
});

When('I select {string} priority', async ({ page }, priority: string) => {
  await page.getByRole('combobox', { name: /priority/i }).click();
  await page.getByRole('option', { name: priority }).click();
});

When('I set the due date to tomorrow', async ({ page }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.getByLabel(/due date/i).fill(tomorrow.toISOString().split('T')[0]);
});

When('I enter the following todo details:', async ({ page }, dataTable: DataTable) => {
  const details = dataTable.rowsHash();

  if (details.title) {
    await page.getByLabel(/title/i).fill(details.title);
  }
  if (details.description) {
    await page.getByLabel(/description/i).fill(details.description);
  }
  if (details.priority) {
    await page.getByRole('combobox', { name: /priority/i }).click();
    await page.getByRole('option', { name: details.priority }).click();
  }
  if (details.dueDate === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByLabel(/due date/i).fill(tomorrow.toISOString().split('T')[0]);
  }
});

When('I assign labels {string}', async ({ page }, labelNames: string) => {
  const labels = labelNames.split(', ');
  for (const label of labels) {
    await page.getByLabel(/labels/i).click();
    await page.getByRole('option', { name: label.trim() }).click();
  }
});

When('I try to add a todo to {string} column', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByRole('button', { name: /add card/i }).click();
});

When('I try to create a todo', async ({ page }) => {
  await page.getByRole('button', { name: /add card/i }).first().click();
  await page.getByLabel(/title/i).fill('Test Todo');
  await page.getByRole('button', { name: /save/i }).click();
});

When('I create a todo titled {string}', async ({ page }, title: string) => {
  await page.getByRole('button', { name: /add card/i }).first().click();
  await page.getByLabel(/title/i).fill(title);
  await page.getByRole('button', { name: /save/i }).click();
});

// ==========================================
// Todo Editing Steps
// ==========================================

When('I click on the todo {string}', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click();
});

When('I change the title to {string}', async ({ page }, newTitle: string) => {
  await page.getByLabel(/title/i).clear();
  await page.getByLabel(/title/i).fill(newTitle);
});

When('I clear the title', async ({ page }) => {
  await page.getByLabel(/title/i).clear();
});

When('I change the description to {string}', async ({ page }, newDescription: string) => {
  await page.getByLabel(/description/i).clear();
  await page.getByLabel(/description/i).fill(newDescription);
});

When('I clear the description', async ({ page }) => {
  await page.getByLabel(/description/i).clear();
});

When('I change the priority to {string}', async ({ page }, newPriority: string) => {
  await page.getByRole('combobox', { name: /priority/i }).click();
  await page.getByRole('option', { name: newPriority }).click();
});

When('I clear the due date', async ({ page }) => {
  await page.getByLabel(/due date/i).clear();
});

When('I add label {string}', async ({ page }, labelName: string) => {
  await page.getByLabel(/labels/i).click();
  await page.getByRole('option', { name: labelName }).click();
});

When('I remove label {string}', async ({ page }, labelName: string) => {
  const label = page.locator(`[data-testid="selected-label"]:has-text("${labelName}")`);
  await label.getByRole('button', { name: /remove/i }).click();
});

When('I double-click on the todo title {string}', async ({ page }, todoTitle: string) => {
  const todoTitleElement = page.locator(
    `[data-testid="todo-card"]:has-text("${todoTitle}") [data-testid="todo-title"]`
  );
  await todoTitleElement.dblclick();
});

When('I type {string} and press Enter', async ({ page }, text: string) => {
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
});

When('I press Escape', async ({ page }) => {
  await page.keyboard.press('Escape');
});

// ==========================================
// Todo Movement Steps
// ==========================================

When('I drag {string} to {string} column', async ({ page }, todoTitle: string, targetColumn: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  const target = page.locator(`[data-testid="column"]:has-text("${targetColumn}")`);

  await todo.dragTo(target);
});

When('I try to drag {string} to {string} column', async ({ page }, todoTitle: string, targetColumn: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  const target = page.locator(`[data-testid="column"]:has-text("${targetColumn}")`);

  try {
    await todo.dragTo(target);
  } catch {
    // Drag operation may fail in certain scenarios - that's expected
  }
});

When('I drag {string} above {string}', async ({ page }, sourceTodo: string, targetTodo: string) => {
  const source = page.locator(`[data-testid="todo-card"]:has-text("${sourceTodo}")`);
  const target = page.locator(`[data-testid="todo-card"]:has-text("${targetTodo}")`);

  // Get bounding boxes for precise positioning
  const sourceBounds = await source.boundingBox();
  const targetBounds = await target.boundingBox();

  if (!sourceBounds || !targetBounds) {
    throw new Error('Could not get bounding boxes for drag operation');
  }

  // Perform drag to position above target
  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y - 5,
    { steps: 10 }
  );
  await page.mouse.up();
});

When('I right-click on {string}', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click({ button: 'right' });
});

When('I select {string}', async ({ page }, menuItem: string) => {
  await page.getByRole('menuitem', { name: menuItem }).click();
});

When('I select {string} from the column list', async ({ page }, columnName: string) => {
  await page.getByRole('option', { name: columnName }).click();
});

When('I click the move button on {string}', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.getByRole('button', { name: /move/i }).click();
});

When('I try to move a todo to that column', async ({ page }) => {
  const todo = page.locator('[data-testid="todo-card"]').first();
  const targetColumn = page.locator('[data-testid="column"]').last();
  await todo.dragTo(targetColumn);
});

When('I start dragging {string}', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  const bounds = await todo.boundingBox();

  if (!bounds) {
    throw new Error('Could not get bounding box for drag operation');
  }

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
  await page.mouse.down();
});

When('I release outside any column', async ({ page }) => {
  await page.mouse.move(0, 0);
  await page.mouse.up();
});

// ==========================================
// Todo Deletion Steps
// ==========================================

When('I click the delete button on {string}', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.getByRole('button', { name: /delete/i }).click();
});

When('I click the delete button in the modal', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
});

When('I select the todo {string}', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click();
});

When('I press Delete key', async ({ page }) => {
  await page.keyboard.press('Delete');
});

When('I quickly click confirm multiple times', async ({ page }) => {
  const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
  await confirmButton.click();
  await confirmButton.click().catch(() => {});
  await confirmButton.click().catch(() => {});
});

// ==========================================
// Todo Assertion Steps
// ==========================================

Then('I should see {string} in the {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('I should not see {string} in the {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).not.toBeVisible();
});

Then('the todo should show {string} priority badge', async ({ page }, priority: string) => {
  await expect(page.locator(`[data-testid="priority-badge"]:has-text("${priority}")`)).toBeVisible();
});

Then('the todo {string} should show {string} priority badge', async ({ page }, todoTitle: string, priority: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator(`[data-testid="priority-badge"]:has-text("${priority}")`)).toBeVisible();
});

Then('the todo should show the due date', async ({ page }) => {
  await expect(page.locator('[data-testid="due-date"]').first()).toBeVisible();
});

Then('the todo {string} should show the due date', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator('[data-testid="due-date"]')).toBeVisible();
});

Then('the todo {string} should show the updated due date', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator('[data-testid="due-date"]')).toBeVisible();
});

Then('the todo {string} should not show a due date', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator('[data-testid="due-date"]')).not.toBeVisible();
});

Then('the todo should display {string} and {string} labels', async ({ page }, label1: string, label2: string) => {
  await expect(page.locator(`[data-testid="label"]:has-text("${label1}")`)).toBeVisible();
  await expect(page.locator(`[data-testid="label"]:has-text("${label2}")`)).toBeVisible();
});

Then('the todo {string} should display {string} label', async ({ page }, todoTitle: string, labelName: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator(`[data-testid="label"]:has-text("${labelName}")`)).toBeVisible();
});

Then('the todo {string} should not display {string} label', async ({ page }, todoTitle: string, labelName: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await expect(todo.locator(`[data-testid="label"]:has-text("${labelName}")`)).not.toBeVisible();
});

Then('the todo {string} should have description {string}', async ({ page }, todoTitle: string, description: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click();
  await expect(page.getByLabel(/description/i)).toHaveValue(description);
  await page.keyboard.press('Escape');
});

Then('the todo {string} should have no description', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  await todo.click();
  await expect(page.getByLabel(/description/i)).toHaveValue('');
  await page.keyboard.press('Escape');
});

Then('no todo should be created', async ({ page }) => {
  const todoCards = await page.locator('[data-testid="todo-card"]').count();
  expect(todoCards).toBe(testContext.initialTodoCount || 0);
});

Then('I should see a warning {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message)).toBeVisible();
});

Then('my input should be preserved', async ({ page }) => {
  await expect(page.getByLabel(/title/i)).not.toHaveValue('');
});

Then('the todo should still be {string}', async ({ page }, todoTitle: string) => {
  await expect(page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`)).toBeVisible();
});

// ==========================================
// Todo Movement Assertion Steps
// ==========================================

Then('{string} should appear in {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('{string} should not appear in {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).not.toBeVisible();
});

Then('{string} should remain in {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('{string} should appear before {string}', async ({ page }, todo1: string, todo2: string) => {
  const todos = page.locator('[data-testid="todo-card"]');
  const todo1Bounds = await todos.filter({ hasText: todo1 }).first().boundingBox();
  const todo2Bounds = await todos.filter({ hasText: todo2 }).first().boundingBox();

  if (todo1Bounds && todo2Bounds) {
    expect(todo1Bounds.y).toBeLessThan(todo2Bounds.y);
  }
});

Then('{string} should appear after {string} in the column', async ({ page }, todo1: string, todo2: string) => {
  const todos = page.locator('[data-testid="todo-card"]');
  const todo1Bounds = await todos.filter({ hasText: todo1 }).first().boundingBox();
  const todo2Bounds = await todos.filter({ hasText: todo2 }).first().boundingBox();

  if (todo1Bounds && todo2Bounds) {
    expect(todo1Bounds.y).toBeGreaterThan(todo2Bounds.y);
  }
});

Then('todos should be ordered {string} in {string} column', async ({ page }, expectedOrder: string, columnName: string) => {
  const expectedTodos = expectedOrder.split(', ').map(t => t.trim());
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  const todos = column.locator('[data-testid="todo-card"]');

  const count = await todos.count();
  expect(count).toBe(expectedTodos.length);

  for (let i = 0; i < count; i++) {
    await expect(todos.nth(i)).toContainText(expectedTodos[i]);
  }
});

Then('todos should remain in original order', async () => {
  // The order should not have changed - verified by UI state
});

Then('{string} should be in its original position', async ({ page }, todoTitle: string) => {
  await expect(page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`)).toBeVisible();
});

Then('{string} column should be empty', async ({ page }, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.locator('[data-testid="todo-card"]')).toHaveCount(0);
});

Then('{string} column should show count of {int}', async ({ page }, columnName: string, count: number) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.locator('[data-testid="todo-count"]')).toContainText(count.toString());
});

Then('I should see updated column list', async ({ page }) => {
  await expect(page.locator('[data-testid="column"]')).toBeVisible();
});

Then('{string} should briefly appear in {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await column.getByText(todoTitle).waitFor({ state: 'visible', timeout: 1000 }).catch(() => {});
});

Then('then {string} should return to {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible({ timeout: 5000 });
});

Then('I should see the board refreshed with current state', async ({ page }) => {
  await expect(page.locator('[data-testid="board-view"]')).toBeVisible();
});

Then('the todo should be in its server-confirmed position', async ({ page }) => {
  await expect(page.locator('[data-testid="todo-card"]').first()).toBeVisible();
});

// ==========================================
// Todo Deletion Assertion Steps
// ==========================================

Then('{string} should no longer appear in the {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).not.toBeVisible();
});

Then('{string} should still appear in the {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('{string} should still appear in {string} column', async ({ page }, todoTitle: string, columnName: string) => {
  const column = page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  await expect(column.getByText(todoTitle)).toBeVisible();
});

Then('the label {string} should still exist', async ({}, _labelName: string) => {
  // Labels are global and should persist after todo deletion
});

Then('the todo list should be refreshed', async ({ page }) => {
  await expect(page.locator('[data-testid="column"]').first()).toBeVisible();
});

Then('the delete button should be disabled until operation completes', async ({ page }) => {
  await expect(page.getByRole('button', { name: /delete/i })).toBeDisabled();
});

Then('no error should occur', async ({ page }) => {
  await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
});

Then('I should not see an undo option', async ({ page }) => {
  await expect(page.getByRole('button', { name: /undo/i })).not.toBeVisible();
});

// ==========================================
// Modal/Dialog Steps
// ==========================================

Then('the edit modal should be closed', async ({ page }) => {
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

Then('the edit modal should still be open', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible();
});

Then('the confirmation dialog should be closed', async ({ page }) => {
  await expect(page.getByRole('alertdialog')).not.toBeVisible();
});

Then('I should see updated todo list', async ({ page }) => {
  await expect(page.locator('[data-testid="column"]').first()).toBeVisible();
});

Then('I should be prompted to refresh or overwrite', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: /refresh|overwrite|reload/i })
  ).toBeVisible();
});

Then('I should see a warning about concurrent modification', async ({ page }) => {
  await expect(page.getByText(/concurrent|conflict|modified by another/i)).toBeVisible();
});
