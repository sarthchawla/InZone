import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Board View page
 * Handles board view operations including columns, todos, and drag-and-drop
 */
export class BoardViewPage {
  readonly page: Page;

  // Page header locators
  readonly pageContainer: Locator;
  readonly backButton: Locator;
  readonly boardTitle: Locator;
  readonly boardDescription: Locator;
  readonly labelsButton: Locator;
  readonly settingsButton: Locator;

  // Board content locators
  readonly columns: Locator;
  readonly addColumnButton: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  // Add column form locators
  readonly addColumnForm: Locator;
  readonly columnNameInput: Locator;
  readonly addColumnSubmitButton: Locator;
  readonly addColumnCancelButton: Locator;

  // Label manager locators
  readonly labelManagerModal: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header
    this.pageContainer = page.locator('[data-testid="board-view"]');
    this.backButton = page.locator('a[href="/"]');
    this.boardTitle = page.locator('h1');
    this.boardDescription = page.locator('h1 + p');
    this.labelsButton = page.getByRole('button', { name: /labels/i });
    this.settingsButton = page.getByRole('button', { name: /settings/i });

    // Board content
    this.columns = page.locator('[data-testid="column"]');
    this.addColumnButton = page.getByRole('button', { name: /add column/i });
    this.loadingSpinner = page.locator('.animate-spin');
    this.errorMessage = page.getByText(/board not found/i);

    // Add column form
    this.addColumnForm = page.locator('[data-testid="add-column-form"]');
    this.columnNameInput = page.getByPlaceholder(/enter column name/i);
    this.addColumnSubmitButton = page.getByRole('button', { name: /^add$/i });
    this.addColumnCancelButton = page.getByRole('button', { name: /cancel/i });

    // Label manager
    this.labelManagerModal = page.getByRole('dialog');
  }

  // Navigation
  async goto(baseUrl: string, boardId: string) {
    await this.page.goto(`${baseUrl}/board/${boardId}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async goBack() {
    await this.backButton.click();
  }

  // Column operations
  getColumn(columnName: string): Locator {
    return this.page.locator(`[data-testid="column"]:has-text("${columnName}")`);
  }

  getColumnByIndex(index: number): Locator {
    return this.columns.nth(index);
  }

  getColumnHeader(columnName: string): Locator {
    return this.getColumn(columnName).locator('[data-testid="column-header"]');
  }

  getColumnTodoCount(columnName: string): Locator {
    return this.getColumn(columnName).locator('[data-testid="todo-count"]');
  }

  getColumnWipIndicator(columnName: string): Locator {
    return this.getColumn(columnName).locator('[data-testid="wip-indicator"]');
  }

  getColumnAddCardButton(columnName: string): Locator {
    return this.getColumn(columnName).getByRole('button', { name: /add card/i });
  }

  getColumnDeleteButton(columnName: string): Locator {
    return this.getColumn(columnName).getByRole('button', { name: /delete/i });
  }

  async getColumnCount(): Promise<number> {
    return await this.columns.count();
  }

  async getColumnNames(): Promise<string[]> {
    const headers = this.page.locator('[data-testid="column-header"]');
    return await headers.allTextContents();
  }

  async clickAddColumn() {
    await this.addColumnButton.click();
  }

  async fillColumnName(name: string) {
    await this.columnNameInput.fill(name);
  }

  async submitAddColumn() {
    await this.addColumnSubmitButton.click();
  }

  async cancelAddColumn() {
    await this.addColumnCancelButton.click();
  }

  async addColumn(name: string) {
    await this.clickAddColumn();
    await this.fillColumnName(name);
    await this.submitAddColumn();
  }

  async deleteColumn(columnName: string, confirm: boolean = true) {
    if (confirm) {
      this.page.once('dialog', dialog => dialog.accept());
    } else {
      this.page.once('dialog', dialog => dialog.dismiss());
    }
    await this.getColumnDeleteButton(columnName).click();
  }

  // Todo operations within a column
  getTodosInColumn(columnName: string): Locator {
    return this.getColumn(columnName).locator('[data-testid="todo-card"]');
  }

  getTodo(todoTitle: string): Locator {
    return this.page.locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  }

  getTodoByTitleInColumn(columnName: string, todoTitle: string): Locator {
    return this.getColumn(columnName).locator(`[data-testid="todo-card"]:has-text("${todoTitle}")`);
  }

  getTodoPriorityBadge(todoTitle: string): Locator {
    return this.getTodo(todoTitle).locator('[data-testid="priority-badge"]');
  }

  getTodoDueDate(todoTitle: string): Locator {
    return this.getTodo(todoTitle).locator('[data-testid="due-date"]');
  }

  getTodoLabels(todoTitle: string): Locator {
    return this.getTodo(todoTitle).locator('[data-testid="label"]');
  }

  async getTodoCountInColumn(columnName: string): Promise<number> {
    return await this.getTodosInColumn(columnName).count();
  }

  async clickAddCardInColumn(columnName: string) {
    await this.getColumnAddCardButton(columnName).click();
  }

  // Drag and drop operations
  async dragTodoToColumn(todoTitle: string, targetColumnName: string) {
    const todo = this.getTodo(todoTitle);
    const targetColumn = this.getColumn(targetColumnName);

    // Get bounding boxes
    const todoBounds = await todo.boundingBox();
    const columnBounds = await targetColumn.boundingBox();

    if (!todoBounds || !columnBounds) {
      throw new Error('Could not get bounding boxes for drag operation');
    }

    // Perform drag
    await this.page.mouse.move(
      todoBounds.x + todoBounds.width / 2,
      todoBounds.y + todoBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      columnBounds.x + columnBounds.width / 2,
      columnBounds.y + columnBounds.height / 2,
      { steps: 10 }
    );
    await this.page.mouse.up();
  }

  async dragTodoBeforeTodo(sourceTodoTitle: string, targetTodoTitle: string) {
    const sourceTodo = this.getTodo(sourceTodoTitle);
    const targetTodo = this.getTodo(targetTodoTitle);

    const sourceBounds = await sourceTodo.boundingBox();
    const targetBounds = await targetTodo.boundingBox();

    if (!sourceBounds || !targetBounds) {
      throw new Error('Could not get bounding boxes for drag operation');
    }

    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y - 5, // Position slightly above target
      { steps: 10 }
    );
    await this.page.mouse.up();
  }

  async dragColumnToPosition(columnName: string, newIndex: number) {
    const column = this.getColumnHeader(columnName);
    const targetColumn = this.getColumnByIndex(newIndex);

    const sourceBounds = await column.boundingBox();
    const targetBounds = await targetColumn.boundingBox();

    if (!sourceBounds || !targetBounds) {
      throw new Error('Could not get bounding boxes for drag operation');
    }

    await this.page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBounds.x - 10, // Position to the left of target
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await this.page.mouse.up();
  }

  // Label manager operations
  async openLabelManager() {
    await this.labelsButton.click();
    await this.labelManagerModal.waitFor({ state: 'visible' });
  }

  async closeLabelManager() {
    await this.labelManagerModal.getByRole('button', { name: /close/i }).click();
    await this.labelManagerModal.waitFor({ state: 'hidden' });
  }

  // Assertions
  async expectBoardTitle(title: string) {
    await expect(this.boardTitle).toHaveText(title);
  }

  async expectBoardDescription(description: string) {
    await expect(this.boardDescription).toHaveText(description);
  }

  async expectColumnCount(count: number) {
    await expect(this.columns).toHaveCount(count);
  }

  async expectColumnVisible(columnName: string) {
    await expect(this.getColumn(columnName)).toBeVisible();
  }

  async expectColumnNotVisible(columnName: string) {
    await expect(this.getColumn(columnName)).not.toBeVisible();
  }

  async expectColumnOrder(expectedOrder: string[]) {
    const actualNames = await this.getColumnNames();
    expect(actualNames).toEqual(expectedOrder);
  }

  async expectTodoVisible(todoTitle: string) {
    await expect(this.getTodo(todoTitle)).toBeVisible();
  }

  async expectTodoNotVisible(todoTitle: string) {
    await expect(this.getTodo(todoTitle)).not.toBeVisible();
  }

  async expectTodoInColumn(todoTitle: string, columnName: string) {
    await expect(this.getTodoByTitleInColumn(columnName, todoTitle)).toBeVisible();
  }

  async expectTodoNotInColumn(todoTitle: string, columnName: string) {
    await expect(this.getTodoByTitleInColumn(columnName, todoTitle)).not.toBeVisible();
  }

  async expectTodoCountInColumn(columnName: string, count: number) {
    await expect(this.getTodosInColumn(columnName)).toHaveCount(count);
  }

  async expectTodoPriority(todoTitle: string, priority: string) {
    await expect(this.getTodoPriorityBadge(todoTitle)).toHaveText(priority);
  }

  async expectTodoDueDate(todoTitle: string, dateText: string | RegExp) {
    await expect(this.getTodoDueDate(todoTitle)).toHaveText(dateText);
  }

  async expectTodoLabel(todoTitle: string, labelName: string) {
    await expect(this.getTodoLabels(todoTitle).filter({ hasText: labelName })).toBeVisible();
  }

  async expectLoadingIndicator() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  async expectErrorMessage() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectWipWarning(columnName: string) {
    await expect(this.getColumnWipIndicator(columnName)).toBeVisible();
  }

  // API Mocking helpers
  async mockBoardResponse(board: {
    id: string;
    name: string;
    description?: string;
    columns: Array<{
      id: string;
      name: string;
      position: number;
      wipLimit?: number;
      todos?: Array<{
        id: string;
        title: string;
        description?: string;
        priority?: string;
        dueDate?: string;
        position: number;
        labels?: Array<{ id: string; name: string; color: string }>;
      }>;
    }>;
  }) {
    await this.page.route(`**/api/boards/${board.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        const formattedBoard = {
          ...board,
          columns: board.columns.map(col => ({
            ...col,
            todos: (col.todos || []).map(todo => ({
              ...todo,
              priority: todo.priority || 'MEDIUM',
              labels: todo.labels || [],
            })),
          })),
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(formattedBoard),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockBoardNotFound(boardId: string) {
    await this.page.route(`**/api/boards/${boardId}`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Board not found' }),
      });
    });
  }

  async mockBoardError(boardId: string, statusCode: number = 500, message: string = 'Internal server error') {
    await this.page.route(`**/api/boards/${boardId}`, async (route) => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: message }),
      });
    });
  }

  async mockCreateTodoSuccess() {
    await this.page.route('**/api/todos', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `todo-${Date.now()}`,
            ...body,
            position: 0,
            labels: [],
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockCreateTodoError(statusCode: number = 400, message: string = 'Failed to create todo') {
    await this.page.route('**/api/todos', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: statusCode,
          contentType: 'application/json',
          body: JSON.stringify({ error: message }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockMoveTodoSuccess() {
    await this.page.route('**/api/todos/*/move', async (route) => {
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
  }

  async mockMoveTodoError(statusCode: number = 400, message: string = 'Failed to move todo') {
    await this.page.route('**/api/todos/*/move', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: statusCode,
          contentType: 'application/json',
          body: JSON.stringify({ error: message }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockCreateColumnSuccess() {
    await this.page.route('**/api/boards/*/columns', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `col-${Date.now()}`,
            ...body,
            position: 0,
            todos: [],
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockCreateColumnError(statusCode: number = 400, message: string = 'Failed to create column') {
    await this.page.route('**/api/boards/*/columns', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: statusCode,
          contentType: 'application/json',
          body: JSON.stringify({ error: message }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockLabelsResponse(labels: Array<{ id: string; name: string; color: string }>) {
    await this.page.route('**/api/labels', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(labels),
        });
      } else {
        await route.continue();
      }
    });
  }
}
