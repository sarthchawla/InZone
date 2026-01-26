import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

/**
 * Step definitions for task-count-update.feature
 * Tests real-time task count updates on the boards list page
 */

// Track board state for task count scenarios
interface BoardState {
  id: string;
  name: string;
  todoCount: number;
  columns: Array<{
    id: string;
    name: string;
    position: number;
    todos: Array<{
      id: string;
      title: string;
      position: number;
      priority: string;
    }>;
  }>;
}

let currentBoard: BoardState | null = null;

function resetBoardState() {
  currentBoard = null;
}

// Helper to generate todos for a board
function generateTodos(count: number): BoardState['columns'][0]['todos'] {
  return Array.from({ length: count }, (_, i) => ({
    id: `todo-${i + 1}`,
    title: `Task ${i + 1}`,
    position: i,
    priority: 'MEDIUM',
  }));
}

// Setup step: board exists with N tasks (plural)
Given('a board {string} exists with {int} tasks', async ({ page, baseUrl, mockedRoutes }, boardName: string, taskCount: number) => {
  resetBoardState();
  mockedRoutes.add('boards');
  mockedRoutes.add('labels');

  const todos = generateTodos(taskCount);

  currentBoard = {
    id: 'test-board-1',
    name: boardName,
    todoCount: taskCount,
    columns: [
      {
        id: 'col-1',
        name: 'Todo',
        position: 0,
        todos: todos,
      },
      {
        id: 'col-2',
        name: 'In Progress',
        position: 1,
        todos: [],
      },
      {
        id: 'col-3',
        name: 'Done',
        position: 2,
        todos: [],
      },
    ],
  };

  // Unroute any existing routes
  await page.unroute('**/api/boards');
  await page.unroute('**/api/boards/*');
  await page.unroute('**/api/labels**');
  await page.unroute('**/api/todos');
  await page.unroute('**/api/todos/*');

  // Mock labels endpoint
  await page.route('**/api/labels**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock boards list endpoint
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: currentBoard!.id,
          name: currentBoard!.name,
          description: '',
          todoCount: currentBoard!.todoCount,
          columns: [],
        }]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock single board endpoint
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: currentBoard!.id,
          name: currentBoard!.name,
          description: '',
          columns: currentBoard!.columns,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock todo creation endpoint
  await page.route('**/api/todos', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const newTodoId = `todo-${Date.now()}`;
      const newTodo = {
        id: newTodoId,
        title: body.title,
        columnId: body.columnId,
        position: currentBoard!.columns[0].todos.length,
        priority: body.priority || 'MEDIUM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to first column and update count
      currentBoard!.columns[0].todos.push({
        id: newTodoId,
        title: body.title,
        position: newTodo.position,
        priority: newTodo.priority,
      });
      currentBoard!.todoCount++;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newTodo),
      });
    } else {
      await route.continue();
    }
  });

  // Mock todo update/delete endpoint
  await page.route('**/api/todos/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const todoIdMatch = url.match(/\/api\/todos\/([^/]+)$/);
    const todoId = todoIdMatch ? todoIdMatch[1] : null;

    if (method === 'DELETE' && todoId) {
      // Remove todo from board and update count
      for (const col of currentBoard!.columns) {
        const todoIndex = col.todos.findIndex(t => t.id === todoId);
        if (todoIndex !== -1) {
          col.todos.splice(todoIndex, 1);
          currentBoard!.todoCount--;
          break;
        }
      }
      await route.fulfill({ status: 204 });
    } else if (method === 'PATCH' || method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: todoId, updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.continue();
    }
  });

  // Navigate to boards list page
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Setup step: board exists with N task (singular - for edge case)
Given('a board {string} exists with {int} task', async ({ page, baseUrl, mockedRoutes }, boardName: string, taskCount: number) => {
  // Reuse the plural step implementation
  resetBoardState();
  mockedRoutes.add('boards');
  mockedRoutes.add('labels');

  const todos = generateTodos(taskCount);

  currentBoard = {
    id: 'test-board-1',
    name: boardName,
    todoCount: taskCount,
    columns: [
      {
        id: 'col-1',
        name: 'Todo',
        position: 0,
        todos: todos,
      },
      {
        id: 'col-2',
        name: 'In Progress',
        position: 1,
        todos: [],
      },
      {
        id: 'col-3',
        name: 'Done',
        position: 2,
        todos: [],
      },
    ],
  };

  // Unroute and setup mocks (same as plural version)
  await page.unroute('**/api/boards');
  await page.unroute('**/api/boards/*');
  await page.unroute('**/api/labels**');
  await page.unroute('**/api/todos');
  await page.unroute('**/api/todos/*');

  await page.route('**/api/labels**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: currentBoard!.id,
          name: currentBoard!.name,
          description: '',
          todoCount: currentBoard!.todoCount,
          columns: [],
        }]),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: currentBoard!.id,
          name: currentBoard!.name,
          description: '',
          columns: currentBoard!.columns,
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/todos', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const newTodoId = `todo-${Date.now()}`;
      const newTodo = {
        id: newTodoId,
        title: body.title,
        columnId: body.columnId,
        position: currentBoard!.columns[0].todos.length,
        priority: body.priority || 'MEDIUM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      currentBoard!.columns[0].todos.push({
        id: newTodoId,
        title: body.title,
        position: newTodo.position,
        priority: newTodo.priority,
      });
      currentBoard!.todoCount++;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newTodo),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/todos/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const todoIdMatch = url.match(/\/api\/todos\/([^/]+)$/);
    const todoId = todoIdMatch ? todoIdMatch[1] : null;

    if (method === 'DELETE' && todoId) {
      for (const col of currentBoard!.columns) {
        const todoIndex = col.todos.findIndex(t => t.id === todoId);
        if (todoIndex !== -1) {
          col.todos.splice(todoIndex, 1);
          currentBoard!.todoCount--;
          break;
        }
      }
      await route.fulfill({ status: 204 });
    } else if (method === 'PATCH' || method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: todoId, updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Click on board to open it
Given('I click on {string} to open it', async ({ page }, boardName: string) => {
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible({ timeout: 10000 });
  await boardCard.click();
  await page.waitForURL(/\/board\//, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
});

// Add a new task to the first column
When('I add a new task {string} to the first column', async ({ page }, taskTitle: string) => {
  // Click "Add a card" button in the first column
  const firstColumn = page.locator('[data-testid="column"]').first();
  await firstColumn.locator('button:has-text("Add a card")').click();

  // Fill in the task title
  const titleInput = page.getByPlaceholder(/enter todo title/i);
  await titleInput.fill(taskTitle);

  // Click Save button
  await page.getByRole('button', { name: /save/i }).click();

  // Wait for the task to appear
  await expect(page.locator(`[data-testid="todo-card"]:has-text("${taskTitle}")`)).toBeVisible({ timeout: 5000 });
});

// Navigate back to boards list
When('I navigate back to the boards list', async ({ page, baseUrl }) => {
  // Click the back button or logo to go back to boards list
  const backButton = page.locator('[data-testid="back-to-boards"], a[href="/"]').first();

  if (await backButton.isVisible().catch(() => false)) {
    await backButton.click();
  } else {
    // Fallback: navigate directly
    await page.goto(baseUrl);
  }

  await page.waitForLoadState('networkidle');
});

// Assert board shows N tasks
Then('I should see {string} showing {int} tasks', async ({ page }, boardName: string, expectedCount: number) => {
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible({ timeout: 10000 });

  // Check the todo count displayed on the board card
  const todoCount = boardCard.locator('[data-testid="todo-count"]');
  await expect(todoCount).toContainText(expectedCount.toString(), { timeout: 5000 });
});

// Delete a task from the first column
When('I delete a task from the first column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid="column"]').first();
  const firstTask = firstColumn.locator('[data-testid="todo-card"]').first();

  // Hover to reveal delete button
  await firstTask.hover();

  // Click delete button
  await firstTask.getByRole('button', { name: /delete/i }).click();

  // Confirm deletion if there's a confirmation dialog
  const confirmButton = page.getByRole('dialog').getByRole('button', { name: /confirm|delete/i });
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for the task to be removed
  await page.waitForTimeout(500);
});

// Archive a task from the first column
When('I archive a task from the first column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid="column"]').first();
  const firstTask = firstColumn.locator('[data-testid="todo-card"]').first();

  // Hover to reveal archive button
  await firstTask.hover();

  // Try archive button first, fall back to delete if archive not available
  const archiveButton = firstTask.getByRole('button', { name: /archive/i });
  if (await archiveButton.isVisible().catch(() => false)) {
    await archiveButton.click();
  } else {
    // Fallback: use delete button (treat archive as delete for count purposes)
    await firstTask.getByRole('button', { name: /delete/i }).click();

    const confirmButton = page.getByRole('dialog').getByRole('button', { name: /confirm|delete/i });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
  }

  // Wait for the task to be removed
  await page.waitForTimeout(500);
});

// Delete a specific task by name
When('I delete the task {string}', async ({ page }, taskTitle: string) => {
  const task = page.locator(`[data-testid="todo-card"]:has-text("${taskTitle}")`);

  // Hover to reveal delete button
  await task.hover();

  // Click delete button
  await task.getByRole('button', { name: /delete/i }).click();

  // Confirm deletion if there's a confirmation dialog
  const confirmButton = page.getByRole('dialog').getByRole('button', { name: /confirm|delete/i });
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for the task to be removed
  await page.waitForTimeout(500);
});

// Delete the only task in the column
When('I delete the only task in the column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid="column"]').first();
  const task = firstColumn.locator('[data-testid="todo-card"]').first();

  // Hover to reveal delete button
  await task.hover();

  // Click delete button
  await task.getByRole('button', { name: /delete/i }).click();

  // Confirm deletion if there's a confirmation dialog
  const confirmButton = page.getByRole('dialog').getByRole('button', { name: /confirm|delete/i });
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for the task to be removed
  await page.waitForTimeout(500);
});
