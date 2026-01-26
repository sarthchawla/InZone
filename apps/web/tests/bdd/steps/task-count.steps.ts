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
      description: string;
      dueDate: string | null;
      labels: Array<{ id: string; name: string; color: string }>;
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
    description: '',
    dueDate: null,
    labels: [],
  }));
}

// Setup routes for a board with mocked API
async function setupBoardMocks(page: import('@playwright/test').Page) {
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
        description: '',
        dueDate: null,
        labels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to first column and update count
      currentBoard!.columns[0].todos.push({
        id: newTodoId,
        title: body.title,
        position: newTodo.position,
        priority: newTodo.priority,
        description: '',
        dueDate: null,
        labels: [],
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
    } else if (method === 'GET' && todoId) {
      // Find the todo
      for (const col of currentBoard!.columns) {
        const todo = col.todos.find(t => t.id === todoId);
        if (todo) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...todo,
              columnId: col.id,
            }),
          });
          return;
        }
      }
      await route.fulfill({ status: 404 });
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

  // Setup mocks
  await setupBoardMocks(page);

  // Navigate to boards list page
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Setup step: board exists with N task (singular - for edge case)
Given('a board {string} exists with {int} task', async ({ page, baseUrl, mockedRoutes }, boardName: string, taskCount: number) => {
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

  // Setup mocks
  await setupBoardMocks(page);

  // Navigate to boards list page
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Click on board to open it
Given('I click on {string} to open it', async ({ page }, boardName: string) => {
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible({ timeout: 10000 });
  await boardCard.click();
  await page.waitForURL(/\/board\//, { timeout: 10000 });
  // Wait for board view to fully load
  await expect(page.locator('[data-testid="board-view"]')).toBeVisible({ timeout: 10000 });
});

// Add a new task to the first column
When('I add a new task {string} to the first column', async ({ page }, taskTitle: string) => {
  // Click "Add a card" button in the first column
  const firstColumn = page.locator('[data-testid="column"]').first();
  const addButton = firstColumn.locator('button:has-text("Add a card")');
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();

  // Fill in the task title using the input with placeholder
  const titleInput = page.getByPlaceholder('Enter todo title...');
  await expect(titleInput).toBeVisible({ timeout: 5000 });
  await titleInput.fill(taskTitle);

  // Click Add button (the inline form has an "Add" button)
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  // Wait for the task to appear
  await expect(page.locator(`[data-testid="todo-card"]:has-text("${taskTitle}")`)).toBeVisible({ timeout: 5000 });
});

// Navigate back to boards list
When('I navigate back to the boards list', async ({ page, baseUrl }) => {
  // Click the back button
  const backButton = page.locator('[data-testid="back-to-boards"]');

  if (await backButton.isVisible().catch(() => false)) {
    await backButton.click();
  } else {
    // Fallback: navigate directly
    await page.goto(baseUrl);
  }

  // Wait for boards list to load
  await expect(page.locator('[data-testid="board-list"]')).toBeVisible({ timeout: 10000 });
});

// Assert board shows N tasks
Then('I should see {string} showing {int} tasks', async ({ page }, boardName: string, expectedCount: number) => {
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible({ timeout: 10000 });

  // The todo count is shown in the format "X columns · Y tasks"
  const todoCountElement = boardCard.locator('[data-testid="todo-count"]');
  await expect(todoCountElement).toContainText(`${expectedCount} task`, { timeout: 5000 });
});

// Delete a task from the first column (opens modal, deletes, confirms)
When('I delete a task from the first column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid="column"]').first();
  const firstTask = firstColumn.locator('[data-testid="todo-card"]').first();

  // Click on the task to open the edit modal
  await firstTask.click();

  // Wait for modal to appear
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Click Delete button
  await modal.getByRole('button', { name: 'Delete' }).click();

  // Confirm deletion by clicking "Confirm Delete"
  await modal.getByRole('button', { name: 'Confirm Delete' }).click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 5000 });
});

// Archive a task from the first column (treat as delete since no archive feature exists)
When('I archive a task from the first column', async ({ page }) => {
  // Archive is the same as delete in this implementation
  const firstColumn = page.locator('[data-testid="column"]').first();
  const firstTask = firstColumn.locator('[data-testid="todo-card"]').first();

  // Click on the task to open the edit modal
  await firstTask.click();

  // Wait for modal to appear
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Click Delete button (no archive exists)
  await modal.getByRole('button', { name: 'Delete' }).click();

  // Confirm deletion by clicking "Confirm Delete"
  await modal.getByRole('button', { name: 'Confirm Delete' }).click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 5000 });
});

// Delete a specific task by name
When('I delete the task {string}', async ({ page }, taskTitle: string) => {
  const task = page.locator(`[data-testid="todo-card"]:has-text("${taskTitle}")`);

  // Click on the task to open the edit modal
  await task.click();

  // Wait for modal to appear
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Click Delete button
  await modal.getByRole('button', { name: 'Delete' }).click();

  // Confirm deletion by clicking "Confirm Delete"
  await modal.getByRole('button', { name: 'Confirm Delete' }).click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 5000 });
});

// Delete the only task in the column
When('I delete the only task in the column', async ({ page }) => {
  const firstColumn = page.locator('[data-testid="column"]').first();
  const task = firstColumn.locator('[data-testid="todo-card"]').first();

  // Click on the task to open the edit modal
  await task.click();

  // Wait for modal to appear
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Click Delete button
  await modal.getByRole('button', { name: 'Delete' }).click();

  // Confirm deletion by clicking "Confirm Delete"
  await modal.getByRole('button', { name: 'Confirm Delete' }).click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 5000 });
});
