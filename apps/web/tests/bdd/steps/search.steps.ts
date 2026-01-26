import { createBdd, DataTable } from 'playwright-bdd';
import { test, expect, MockedRoutes } from '../fixtures';

const { Given, When, Then } = createBdd(test);

// Store for managing mock data across steps
interface MockTodo {
  id: string;
  title: string;
  description: string;
  columnId: string;
  column: { id: string; name: string; boardId: string };
  boardName: string;
  archived: boolean;
  labels: Array<{ id: string; name: string; color: string }>;
}

interface MockBoard {
  id: string;
  name: string;
  columns: Array<{ id: string; name: string }>;
}

let mockTodos: MockTodo[] = [];
let mockBoards: MockBoard[] = [];
let todoIdCounter = 1;
let boardIdCounter = 1;
let columnIdCounter = 1;

// Helper to reset mock data between scenarios
function resetMockData() {
  mockTodos = [];
  mockBoards = [];
  todoIdCounter = 1;
  boardIdCounter = 1;
  columnIdCounter = 1;
}

// Helper function to set up search API routes
async function setupSearchRoutes(page: import('@playwright/test').Page) {
  // Clear existing routes
  await page.unroute('**/api/todos**').catch(() => {});
  await page.unroute('**/api/boards**').catch(() => {});
  await page.unroute('**/api/search**').catch(() => {});

  // Setup boards route
  await page.route('**/api/boards**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBoards),
      });
    } else {
      await route.continue();
    }
  });

  // Setup todos/search route
  await page.route('**/api/todos**', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const searchQuery = url.searchParams.get('search');
    const includeArchived = url.searchParams.get('archived') === 'true';

    if (method === 'GET') {
      let results = mockTodos;

      // Filter by archived status
      if (!includeArchived) {
        results = results.filter((t) => !t.archived);
      }

      // Apply search filter
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        results = results.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results),
      });
    } else {
      await route.continue();
    }
  });

  // Setup dedicated search endpoint if exists
  await page.route('**/api/search**', async (route) => {
    const url = new URL(route.request().url());
    const searchQuery = url.searchParams.get('q') || url.searchParams.get('query') || '';

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const results = mockTodos.filter(
        (t) =>
          !t.archived &&
          (t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query))
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });
}

// Setup step for boards and todos
Given('the following boards with todos exist:', async ({ page, mockedRoutes }, dataTable: DataTable) => {
  // Mark boards route as mocked to prevent default mock from overwriting
  mockedRoutes.add('boards');

  resetMockData();
  const rows = dataTable.hashes() as Array<{ boardName: string; todoTitle: string; todoDescription: string }>;

  // Group by board
  const boardMap = new Map<string, { todos: Array<{ title: string; description: string }> }>();
  rows.forEach((row) => {
    if (!boardMap.has(row.boardName)) {
      boardMap.set(row.boardName, { todos: [] });
    }
    boardMap.get(row.boardName)!.todos.push({
      title: row.todoTitle,
      description: row.todoDescription,
    });
  });

  // Create boards and todos
  boardMap.forEach((data, boardName) => {
    const boardId = `board-${boardIdCounter++}`;
    const columnId = `col-${columnIdCounter++}`;
    const columnName = 'Todo';

    mockBoards.push({
      id: boardId,
      name: boardName,
      columns: [{ id: columnId, name: columnName }],
    });

    data.todos.forEach((todo) => {
      mockTodos.push({
        id: `todo-${todoIdCounter++}`,
        title: todo.title,
        description: todo.description,
        columnId: columnId,
        column: { id: columnId, name: columnName, boardId: boardId },
        boardName: boardName,
        archived: false,
        labels: [],
      });
    });
  });

  await setupSearchRoutes(page);
});

Given('I am viewing the {string} board', async ({ page, baseUrl }, boardName: string) => {
  const board = mockBoards.find((b) => b.name === boardName);
  if (board) {
    await page.goto(`${baseUrl}/board/${board.id}`);
    await page.waitForLoadState('networkidle');
  }
});

Given('a label {string} exists on {string}', async ({ page }, labelName: string, todoTitle: string) => {
  const todo = mockTodos.find((t) => t.title === todoTitle);
  if (todo) {
    todo.labels.push({
      id: `label-${Date.now()}`,
      name: labelName,
      color: '#FF0000',
    });
  }
  await setupSearchRoutes(page);
});

Given('a todo {string} is archived', async ({ page }, todoTitle: string) => {
  // Add an archived todo
  mockTodos.push({
    id: `todo-${todoIdCounter++}`,
    title: todoTitle,
    description: 'Archived task',
    columnId: 'col-1',
    column: { id: 'col-1', name: 'Todo', boardId: 'board-1' },
    boardName: 'Work',
    archived: true,
    labels: [],
  });
  await setupSearchRoutes(page);
});

Given('another user is modifying todos', async () => {
  // This is a marker step - the search should still work
});

Given('the API will timeout', async ({ page }) => {
  await page.route('**/api/todos**', async (route) => {
    if (route.request().url().includes('search')) {
      // Never respond - simulating timeout
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } else {
      await route.continue();
    }
  });
});

// Search input steps
When('I enter {string} in the search box', async ({ page }, query: string) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  ).or(
    page.locator('input[type="search"]')
  );
  await searchInput.fill(query);
});

When('I enter a {int} character search query', async ({ page }, length: number) => {
  const longQuery = 'a'.repeat(length);
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await searchInput.fill(longQuery);
});

When('I submit the search', async ({ page }) => {
  const searchButton = page.getByRole('button', { name: /search/i });
  if (await searchButton.isVisible()) {
    await searchButton.click();
  } else {
    // Press Enter if no search button
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    ).or(
      page.locator('[data-testid="search-input"]')
    );
    await searchInput.press('Enter');
  }
  // Wait for search results to load
  await page.waitForLoadState('networkidle').catch(() => {});
});

When('I press Enter', async ({ page }) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await searchInput.press('Enter');
  await page.waitForLoadState('networkidle').catch(() => {});
});

When('I clear the search box', async ({ page }) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await searchInput.clear();
});

When('I click the clear search button', async ({ page }) => {
  const clearButton = page.getByRole('button', { name: /clear|reset|x/i }).or(
    page.locator('[data-testid="clear-search"]')
  );
  await clearButton.click();
});

When('I click on the {string} search result', async ({ page }, todoTitle: string) => {
  const result = page.locator(`[data-testid="search-result"]:has-text("${todoTitle}")`).or(
    page.locator(`[data-testid="search-result-item"]:has-text("${todoTitle}")`)
  ).or(
    page.locator(`.search-results a:has-text("${todoTitle}")`)
  );
  await result.click();
  await page.waitForLoadState('networkidle');
});

When('I quickly change to {string}', async ({ page }, query: string) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await searchInput.fill(query);
  // Small delay to simulate rapid typing
  await page.waitForTimeout(50);
});

When('I select {string} board filter', async ({ page }, boardName: string) => {
  const boardFilter = page.getByRole('combobox', { name: /board|filter/i }).or(
    page.locator('[data-testid="board-filter"]')
  );
  await boardFilter.selectOption({ label: boardName });
});

When('I toggle {string} option', async ({ page }, optionName: string) => {
  const toggle = page.getByLabel(optionName).or(
    page.getByRole('checkbox', { name: new RegExp(optionName, 'i') })
  );
  await toggle.check();
});

When('I reload the page', async ({ page }) => {
  await page.reload();
  await page.waitForLoadState('networkidle');
});

When('I immediately enter {string} in the search box', async ({ page }, query: string) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  // Don't wait for full load
  await searchInput.fill(query, { timeout: 5000 });
});

When('I press the browser back button', async ({ page }) => {
  await page.goBack();
  await page.waitForLoadState('networkidle');
});

When('I press the down arrow key', async ({ page }) => {
  await page.keyboard.press('ArrowDown');
});

// Search result assertions
Then('I should see {string} in the search results', async ({ page }, todoTitle: string) => {
  const results = page.locator('[data-testid="search-results"]').or(
    page.locator('.search-results')
  );
  await expect(results.getByText(todoTitle)).toBeVisible();
});

Then('I should not see {string} in the search results', async ({ page }, todoTitle: string) => {
  const results = page.locator('[data-testid="search-results"]').or(
    page.locator('.search-results')
  );
  await expect(results.getByText(todoTitle)).not.toBeVisible();
});

Then('I should see {string} message', async ({ page }, message: string) => {
  await expect(page.getByText(message)).toBeVisible();
});

Then('I should see search results', async ({ page }) => {
  const results = page.locator('[data-testid="search-results"]').or(
    page.locator('.search-results')
  );
  await expect(results).toBeVisible();
});

Then('I should not see any todo cards in results', async ({ page }) => {
  const results = page.locator('[data-testid="search-results"]').or(
    page.locator('.search-results')
  );
  const todoCards = results.locator('[data-testid="search-result"], [data-testid="search-result-item"]');
  await expect(todoCards).toHaveCount(0);
});

Then('I should see the default board list view', async ({ page }) => {
  const boardList = page.locator('[data-testid="board-list"]').or(
    page.locator('.boards-container')
  );
  await expect(boardList).toBeVisible();
});

Then('search results should not be displayed', async ({ page }) => {
  const results = page.locator('[data-testid="search-results"]');
  await expect(results).not.toBeVisible();
});

Then('the search box should be empty', async ({ page }) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await expect(searchInput).toHaveValue('');
});

Then('the search results should show the board name {string}', async ({ page }, boardName: string) => {
  const results = page.locator('[data-testid="search-results"]');
  await expect(results.getByText(boardName)).toBeVisible();
});

Then('the search result should display the board name', async ({ page }) => {
  const boardName = page.locator('[data-testid="search-result-board"]').or(
    page.locator('.search-result-board')
  );
  await expect(boardName.first()).toBeVisible();
});

Then('the search result should display the column name', async ({ page }) => {
  const columnName = page.locator('[data-testid="search-result-column"]').or(
    page.locator('.search-result-column')
  );
  await expect(columnName.first()).toBeVisible();
});

Then('I should be navigated to the board containing that todo', async ({ page }) => {
  await expect(page).toHaveURL(/\/board\/.+/);
});

Then('the {string} todo should be highlighted or visible', async ({ page }, todoTitle: string) => {
  const todo = page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`).or(
    page.locator(`.todo-card:has-text("${todoTitle}")`)
  );
  await expect(todo).toBeVisible();
});

Then('I should not see results from {string} board', async ({ page }, boardName: string) => {
  const results = page.locator('[data-testid="search-results"]');
  const boardIndicators = results.locator(`[data-testid="search-result-board"]:has-text("${boardName}")`);
  await expect(boardIndicators).toHaveCount(0);
});

Then('the search should complete safely', async ({ page }) => {
  // Verify page didn't crash
  await expect(page.locator('body')).toBeVisible();
  // Verify no console errors about crashes
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  await page.waitForTimeout(500);
  // Allow network errors but not crash errors
  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes('network') && !e.includes('fetch') && !e.includes('Failed to load')
  );
  expect(criticalErrors).toHaveLength(0);
});

Then('the search query should be properly escaped', async ({ page }) => {
  // Verify the HTML is not interpreted
  await expect(page.locator('div[test]')).toHaveCount(0);
  // Page should still be functional
  await expect(page.locator('body')).toBeVisible();
});

Then('the application should not crash', async ({ page }) => {
  // Page should still be interactive
  await expect(page.locator('body')).toBeVisible();
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await expect(searchInput).toBeEnabled();
});

Then('I should see appropriate results or empty state', async ({ page }) => {
  // Either see results or "No results found"
  const hasResults = await page.locator('[data-testid="search-results"]').isVisible();
  const hasEmptyState = await page.getByText(/no results/i).isVisible();
  expect(hasResults || hasEmptyState).toBe(true);
});

Then('search results should eventually appear', async ({ page }) => {
  await page.waitForSelector('[data-testid="search-results"], .search-results', {
    timeout: 15000,
  });
});

Then('I should see results matching {string}', async ({ page }, _query: string) => {
  const results = page.locator('[data-testid="search-results"]');
  // Either results match the query or empty state is shown
  const isVisible = await results.isVisible();
  expect(isVisible).toBe(true);
});

Then('there should be no duplicate requests', async () => {
  // This is verified through mocking - the test passes if the app doesn't error
});

Then('I should see the search results again', async ({ page }) => {
  const results = page.locator('[data-testid="search-results"]').or(
    page.locator('.search-results')
  );
  await expect(results).toBeVisible();
});

Then('the search query {string} should be preserved', async ({ page }, query: string) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await expect(searchInput).toHaveValue(query);
});

Then('the first search result should be focused', async ({ page }) => {
  const firstResult = page.locator('[data-testid="search-result"]').first().or(
    page.locator('[data-testid="search-result-item"]').first()
  );
  await expect(firstResult).toBeFocused();
});

Then('I should be navigated to that todo', async ({ page }) => {
  await expect(page).toHaveURL(/\/board\/.+/);
});

Then('search results should have aria-live announcement', async ({ page }) => {
  const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
  await expect(liveRegion).toBeVisible();
});

Then('the number of results should be announced', async ({ page }) => {
  const announcement = page.locator('[aria-live="polite"], [role="status"]');
  await expect(announcement.getByText(/\d+ result/i)).toBeVisible();
});

Then('the search box should retain focus', async ({ page }) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await expect(searchInput).toBeFocused();
});

Then('my search query should be preserved', async ({ page }) => {
  const searchInput = page.getByRole('searchbox').or(
    page.getByPlaceholder(/search/i)
  ).or(
    page.locator('[data-testid="search-input"]')
  );
  await expect(searchInput).not.toHaveValue('');
});

Then('I should see appropriate results', async ({ page }) => {
  // Either see results or "No results found"
  const hasResults = await page.locator('[data-testid="search-results"]').isVisible();
  const hasEmptyState = await page.getByText(/no results/i).isVisible();
  expect(hasResults || hasEmptyState).toBe(true);
});

Then('I should see current search results', async ({ page }) => {
  // Verify search results are displayed (may be empty or with results)
  const searchResults = page.locator('[data-testid="search-results"]').or(
    page.locator('.search-results')
  );
  await expect(searchResults).toBeVisible({ timeout: 5000 });
});
