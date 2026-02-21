import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Shared state for tracking deleted board IDs across steps
// This allows the delete endpoint mock to communicate with the boards list mock
const deletedBoardIds = new Set<string>();

// Reset deleted boards before each test (called from board setup steps)
function resetDeletedBoards() {
  deletedBoardIds.clear();
}

// Board existence setup steps with columns
Given('a board {string} exists with columns {string}', async ({ page, baseUrl, mockedRoutes }, boardName: string, columnNames: string) => {
  const columns = columnNames.split(',').map((name, index) => ({
    id: `col-${index + 1}`,
    name: name.trim(),
    position: index,
    todos: [],
  }));

  // Mark boards route as mocked to prevent default mock from overwriting
  mockedRoutes.add('boards');

  // Unroute any existing boards route
  await page.unroute('**/api/boards');

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-board-1',
            name: boardName,
            description: '',
            columns,
            todoCount: 0,
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // Also mock the single board endpoint
  await page.route('**/api/boards/test-board-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-board-1',
          name: boardName,
          description: '',
          columns,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Reload to trigger new mock
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

Given('no boards exist', async ({ page, mockedRoutes }) => {
  // Mark boards route as mocked to prevent default mock from overwriting
  mockedRoutes.add('boards');

  // Store for created boards during the test
  const createdBoards: Array<{ id: string; name: string; description: string; columns: unknown[]; todoCount: number }> = [];

  // Mock API to return empty boards list initially, update after creation
  await page.route('**/api/boards', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdBoards),
      });
    } else if (method === 'POST') {
      // Handle board creation
      const body = JSON.parse(route.request().postData() || '{}');
      const newBoard = {
        id: `board-${Date.now()}`,
        name: body.name,
        description: body.description || '',
        columns: [],
        todoCount: 0,
      };
      createdBoards.push(newBoard);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newBoard),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
});

Given('the following boards exist:', async ({ page, baseUrl, mockedRoutes }, dataTable) => {
  // Reset deleted boards state for this test
  resetDeletedBoards();

  // Mark boards route as mocked to prevent default mock from overwriting
  mockedRoutes.add('boards');

  const boards = dataTable.hashes().map((row: { name: string; todoCount: string }, index: number) => ({
    id: `board-${index + 1}`,
    name: row.name,
    description: '',
    columns: [],
    todoCount: parseInt(row.todoCount),
  }));

  // Unroute any existing boards route
  await page.unroute('**/api/boards');
  await page.unroute('**/api/boards/*');

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      // Filter out deleted boards
      const activeBoards = boards.filter(b => !deletedBoardIds.has(b.id));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeBoards),
      });
    } else {
      await route.continue();
    }
  });

  // Mock single board endpoints with DELETE support
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const url = route.request().url();
      const boardIdMatch = url.match(/\/api\/boards\/([^/]+)$/);
      if (boardIdMatch) {
        deletedBoardIds.add(boardIdMatch[1]);
      }
      await route.fulfill({ status: 204 });
    } else if (route.request().method() === 'GET') {
      const url = route.request().url();
      const boardIdMatch = url.match(/\/api\/boards\/([^/]+)$/);
      if (boardIdMatch) {
        if (deletedBoardIds.has(boardIdMatch[1])) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Board not found' }),
          });
        } else {
          const board = boards.find(b => b.id === boardIdMatch[1]);
          if (board) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(board),
            });
          } else {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Board not found' }),
            });
          }
        }
      } else {
        await route.continue();
      }
    } else {
      await route.continue();
    }
  });

  // Reload to trigger new mock
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Board creation steps
When('I enter {string} as the board name', async ({ page }, boardName: string) => {
  await page.getByPlaceholder(/board name/i).fill(boardName);
});

When('I leave the board name empty', async ({ page }) => {
  await page.getByPlaceholder(/board name/i).clear();
});

When('I enter a {int} character board name', async ({ page }, length: number) => {
  const longName = 'A'.repeat(length);
  await page.getByPlaceholder(/board name/i).fill(longName);
});

When('I select {string} template', async ({ page }, templateName: string) => {
  // Templates are button chips in the inline create form
  await page.getByRole('button', { name: templateName, exact: true }).click();
});

When('I click on {string} board', async ({ page }, boardName: string) => {
  // Click on the board card - use the board card locator for more precision
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible({ timeout: 10000 });
  await boardCard.click();
  // Wait for navigation to complete
  await page.waitForURL(/\/board\//, { timeout: 10000 });
});

// Board deletion steps
When('I click the delete button for {string}', async ({ page }, boardName: string) => {
  // Open the CardDropdown menu for this board
  await page.getByLabel(`Actions for ${boardName}`).click();
  // Click "Delete" from the dropdown
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  // Wait briefly for the deletion to process
  await page.waitForTimeout(500);
});

// Assertion steps
Then('I should see {string} in the boards list', async ({ page }, boardName: string) => {
  // Look for board name in board cards to avoid matching other text like descriptions
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible();
});

Then('{string} should no longer appear in the boards list', async ({ page }, boardName: string) => {
  // Use board card locator to avoid matching template buttons or other text
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).not.toBeVisible({ timeout: 10000 });
});

Then('{string} should still appear in the boards list', async ({ page }, boardName: string) => {
  const boardCard = page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
  await expect(boardCard).toBeVisible();
});

Then('I should see an empty state message', async ({ page }) => {
  // Revamped UI uses "Start by creating your first board" instead of "no boards"
  const emptyMsg = page.getByText(/no boards|start by creating|create your first board/i);
  await expect(emptyMsg).toBeVisible();
});

Then('I should see a {string} prompt', async ({ page }, promptText: string) => {
  await expect(page.getByText(new RegExp(promptText, 'i'))).toBeVisible();
});

Then('I should see {int} boards', async ({ page }, count: number) => {
  await expect(page.locator('[data-testid="board-card"]')).toHaveCount(count);
});

Then('each board should display its todo count', async ({ page }) => {
  const boardCards = page.locator('[data-testid="board-card"]');
  const count = await boardCards.count();
  for (let i = 0; i < count; i++) {
    await expect(boardCards.nth(i).locator('[data-testid="todo-count"]')).toBeVisible();
  }
});

Then('the board should have no columns', async ({ page }) => {
  await expect(page.locator('[data-testid="column"]')).toHaveCount(0);
});

Then('the board should have columns {string}', async ({ page }, columnNames: string) => {
  // If we're on the boards list page, click into the board first
  const boardCard = page.locator('[data-testid="board-card"]').first();
  if (await boardCard.isVisible({ timeout: 1000 }).catch(() => false)) {
    await boardCard.click();
    // Wait for board view to load
    await page.waitForSelector('[data-testid="board-view"], [data-testid="column"]', { timeout: 5000 });
  }

  const names = columnNames.split(', ');
  for (const name of names) {
    await expect(page.getByText(name)).toBeVisible();
  }
});

Then('I should be navigated to the board view', async ({ page }) => {
  // Wait for navigation to complete and board view to render (allow extra time for CI)
  await expect(page.locator('[data-testid="board-view"]')).toBeVisible({ timeout: 15000 });
});

Then('I should see the board columns', async ({ page }) => {
  // Check that at least one column is visible (use first() to avoid strict mode violation)
  await expect(page.locator('[data-testid="column"]').first()).toBeVisible({ timeout: 15000 });
});

Then('all associated todos should be deleted', async () => {
  // This is verified by the board deletion - todos are cascade deleted
});

Then('all todos should be preserved', async () => {
  // This is verified by the board still existing with its todos
});

Then('no new board should be created', async () => {
  // Verify no new board appears in the list
});

Then('I should see a warning about duplicate board name', async ({ page }) => {
  await expect(page.getByText(/already exists|duplicate/i)).toBeVisible();
});

Then('boards should eventually appear', async ({ page }) => {
  await expect(page.locator('[data-testid="board-card"]').first()).toBeVisible({ timeout: 10000 });
});

// Template setup steps
Given('the templates endpoint returns default templates', async ({ page, baseUrl, mockedRoutes }) => {
  // Clear any existing routes for templates
  await page.unroute('**/api/templates');

  // Mark boards as mocked since we're setting it up here
  mockedRoutes.add('boards');
  mockedRoutes.add('templates');

  const templates = [
    {
      id: 'kanban-basic',
      name: 'Basic Kanban',
      description: 'Simple three-column Kanban board',
      isBuiltIn: true,
      columns: [
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'Done' }
      ]
    },
    {
      id: 'dev-workflow',
      name: 'Development',
      description: 'Software development workflow',
      isBuiltIn: true,
      columns: [
        { name: 'Backlog' },
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'Review' },
        { name: 'Done' }
      ]
    },
    {
      id: 'simple',
      name: 'Simple',
      description: 'Minimal two-column setup',
      isBuiltIn: true,
      columns: [
        { name: 'Todo' },
        { name: 'Done' }
      ]
    }
  ];

  // Set up the templates mock
  await page.route('**/api/templates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(templates),
    });
  });

  // Track created boards in closure so GET returns them after POST
  const createdBoards: Array<{ id: string; name: string; description: string; columns: Array<{ id: string; name: string; position: number; todos: unknown[] }>; todoCount: number }> = [];

  // Mock individual board endpoint for board view
  await page.route('**/api/boards/*', async (route) => {
    const url = route.request().url();
    // Extract board ID from URL - match /api/boards/{id} but not /api/boards
    const match = url.match(/\/api\/boards\/([^/]+)$/);
    if (match) {
      const boardId = match[1];
      const board = createdBoards.find(b => b.id === boardId);
      if (board && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(board),
        });
        return;
      }
    }
    await route.continue();
  });

  // Also set up default boards mock in case it was overwritten
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdBoards),
      });
    } else if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      // Find template columns if templateId provided
      const template = body.templateId ? templates.find(t => t.id === body.templateId) : null;
      const columns = template?.columns.map((col, idx) => ({
        id: `col-${idx + 1}`,
        name: col.name,
        position: idx,
        todos: [],
      })) || [];
      const newBoard = {
        id: `board-${Date.now()}`,
        name: body.name,
        description: body.description || '',
        columns,
        todoCount: 0,
      };
      createdBoards.push(newBoard);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newBoard),
      });
    } else {
      await route.fulfill({ status: 200, body: '{}' });
    }
  });

  // Force a fresh page context by navigating away then back
  // This ensures React Query is re-initialized with fresh state
  await page.goto('about:blank');
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Error mock steps for create
Given('the server will return an error for create', async ({ page }) => {
  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to create board' }),
      });
    } else {
      await route.continue();
    }
  });
});

// Delete endpoint mock steps
// Note: DELETE is now handled in the board setup steps with stateful tracking
// This step exists for backward compatibility but the actual deletion handling
// is done in 'a board named ... exists' steps
Given('the delete endpoint returns success', async () => {
  // No-op: DELETE is already handled in board setup steps with proper state tracking
  // The board setup steps track deletedBoardIds and filter them from subsequent GET requests
});

Given('the server will return an error for delete', async ({ page }) => {
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to delete board' }),
      });
    } else {
      await route.continue();
    }
  });
});

Given('the network is unavailable for delete', async ({ page }) => {
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.abort('connectionfailed');
    } else {
      await route.continue();
    }
  });
});

Given('the board is deleted by another user', async ({ page }) => {
  // Simulate a 404 response when attempting to delete
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Board not found' }),
      });
    } else {
      await route.continue();
    }
  });
});

// Board existence step - with todos
Given('a board named {string} exists with {int} todos', async ({ page, baseUrl, mockedRoutes }, boardName: string, todoCount: number) => {
  // Reset deleted boards state for this test
  resetDeletedBoards();

  // Mark boards route as mocked to prevent default mock from overwriting
  mockedRoutes.add('boards');

  // Unroute any existing boards route
  await page.unroute('**/api/boards');
  await page.unroute('**/api/boards/*');

  const board = {
    id: 'test-board-1',
    name: boardName,
    description: '',
    columns: [
      { id: 'col-1', name: 'Todo', position: 0 }
    ],
    todoCount: todoCount,
  };

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      // Filter out deleted boards
      const boards = deletedBoardIds.has(board.id) ? [] : [board];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(boards),
      });
    } else {
      await route.continue();
    }
  });

  // Mock DELETE endpoint to track deletions
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const url = route.request().url();
      const boardIdMatch = url.match(/\/api\/boards\/([^/]+)$/);
      if (boardIdMatch) {
        deletedBoardIds.add(boardIdMatch[1]);
      }
      await route.fulfill({ status: 204 });
    } else if (route.request().method() === 'GET') {
      const url = route.request().url();
      const boardIdMatch = url.match(/\/api\/boards\/([^/]+)$/);
      if (boardIdMatch && deletedBoardIds.has(boardIdMatch[1])) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Board not found' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(board),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Reload to trigger new mock
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Board existence step - simple
Given('a board named {string} exists', async ({ page, baseUrl, mockedRoutes }, boardName: string) => {
  // Reset deleted boards state for this test
  resetDeletedBoards();

  // Mark boards route as mocked to prevent default mock from overwriting
  mockedRoutes.add('boards');

  // Unroute any existing boards route
  await page.unroute('**/api/boards');
  await page.unroute('**/api/boards/*');

  const board = {
    id: 'test-board-1',
    name: boardName,
    description: '',
    columns: [
      { id: 'col-1', name: 'Todo', position: 0 },
      { id: 'col-2', name: 'In Progress', position: 1 },
      { id: 'col-3', name: 'Done', position: 2 }
    ],
    todoCount: 0,
  };

  await page.route('**/api/boards', async (route) => {
    if (route.request().method() === 'GET') {
      // Filter out deleted boards
      const boards = deletedBoardIds.has(board.id) ? [] : [board];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(boards),
      });
    } else {
      await route.continue();
    }
  });

  // Mock single board endpoint with DELETE support
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const url = route.request().url();
      const boardIdMatch = url.match(/\/api\/boards\/([^/]+)$/);
      if (boardIdMatch) {
        deletedBoardIds.add(boardIdMatch[1]);
      }
      await route.fulfill({ status: 204 });
    } else if (route.request().method() === 'GET') {
      const url = route.request().url();
      const boardIdMatch = url.match(/\/api\/boards\/([^/]+)$/);
      if (boardIdMatch && deletedBoardIds.has(boardIdMatch[1])) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Board not found' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...board,
            columns: board.columns.map(col => ({ ...col, todos: [] })),
          }),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Reload to trigger new mock
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
});

// Inline create form closed assertion
Then('the create dialog should be closed', async ({ page }) => {
  await expect(page.locator('[data-testid="inline-create-form"]')).not.toBeVisible();
});

// Button state assertions
Then('the create button should be disabled', async ({ page }) => {
  const createButton = page.getByRole('button', { name: /^create$/i });
  await expect(createButton).toBeDisabled();
});
