import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Board List page (home page)
 * Handles board listing, creation, and deletion operations
 */
export class BoardListPage {
  readonly page: Page;

  // Locators
  readonly pageContainer: Locator;
  readonly ghostCard: Locator;
  readonly createBoardButton: Locator;
  readonly boardCards: Locator;
  readonly emptyStateMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;

  // Inline create form locators
  readonly inlineCreateForm: Locator;
  readonly boardNameInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly formErrorMessage: Locator;

  // Confirmation dialog locators
  readonly confirmDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main page locators
    this.pageContainer = page.locator('[data-testid="board-list"]');
    this.ghostCard = page.locator('[data-testid="ghost-card"]');
    this.createBoardButton = page.getByRole('button', { name: /create board/i });
    this.boardCards = page.locator('[data-testid="board-card"]');
    this.emptyStateMessage = page.getByText(/no boards/i);
    this.loadingSpinner = page.locator('.animate-spin');
    this.errorMessage = page.getByText(/failed to load boards/i);
    this.retryButton = page.getByRole('button', { name: /retry/i });

    // Inline create form locators
    this.inlineCreateForm = page.locator('[data-testid="inline-create-form"]');
    this.boardNameInput = page.getByPlaceholder(/board name/i);
    this.createButton = page.getByRole('button', { name: /^create$/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.formErrorMessage = page.locator('.bg-red-50');

    // Confirmation dialog locators
    this.confirmDialog = page.getByRole('alertdialog');
    this.confirmDeleteButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    this.cancelDeleteButton = page.getByRole('button', { name: /cancel|no/i });
  }

  // Navigation
  async goto(baseUrl: string = 'http://localhost:5173') {
    await this.page.goto(`${baseUrl}/`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    // Wait for loading to finish
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // Board card operations
  getBoardCard(boardName: string): Locator {
    return this.page.locator(`a:has-text("${boardName}")`);
  }

  getBoardDeleteButton(boardName: string): Locator {
    return this.getBoardCard(boardName).getByRole('button');
  }

  getBoardTodoCount(boardName: string): Locator {
    return this.getBoardCard(boardName).locator('[data-testid="todo-count"], :text-matches("\\\\d+ tasks?")');
  }

  async getBoardCount(): Promise<number> {
    return await this.boardCards.count();
  }

  async clickBoard(boardName: string) {
    await this.getBoardCard(boardName).click();
  }

  // Board creation
  async openCreateForm() {
    // In empty state, inline form is already visible
    if (await this.inlineCreateForm.isVisible({ timeout: 1000 }).catch(() => false)) {
      return;
    }
    // Otherwise click ghost card to reveal the inline form
    await this.ghostCard.click();
    await this.inlineCreateForm.waitFor({ state: 'visible' });
  }

  async fillBoardName(name: string) {
    await this.boardNameInput.fill(name);
  }

  async clearBoardName() {
    await this.boardNameInput.clear();
  }

  async selectTemplate(templateName: string) {
    await this.page.getByRole('button', { name: templateName, exact: true }).click();
  }

  async submitCreateForm() {
    await this.createButton.click();
  }

  async cancelCreate() {
    await this.cancelButton.click();
    await this.inlineCreateForm.waitFor({ state: 'hidden' });
  }

  async createBoard(name: string, options?: { template?: string }) {
    await this.openCreateForm();
    await this.fillBoardName(name);
    if (options?.template) {
      await this.selectTemplate(options.template);
    }
    await this.submitCreateForm();
    await this.inlineCreateForm.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // Board deletion
  async clickDeleteButton(boardName: string) {
    await this.getBoardDeleteButton(boardName).click();
  }

  async confirmDelete() {
    // Handle browser confirm dialog
    this.page.once('dialog', dialog => dialog.accept());
  }

  async cancelDelete() {
    // Handle browser confirm dialog
    this.page.once('dialog', dialog => dialog.dismiss());
  }

  async deleteBoard(boardName: string, confirm: boolean = true) {
    if (confirm) {
      this.page.once('dialog', dialog => dialog.accept());
    } else {
      this.page.once('dialog', dialog => dialog.dismiss());
    }
    await this.clickDeleteButton(boardName);
  }

  // Assertions
  async expectBoardVisible(boardName: string) {
    await expect(this.getBoardCard(boardName)).toBeVisible();
  }

  async expectBoardNotVisible(boardName: string) {
    await expect(this.getBoardCard(boardName)).not.toBeVisible();
  }

  async expectBoardCount(count: number) {
    await expect(this.boardCards).toHaveCount(count);
  }

  async expectEmptyState() {
    await expect(this.emptyStateMessage).toBeVisible();
  }

  async expectLoadingIndicator() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  async expectErrorMessage(message?: string | RegExp) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(this.errorMessage).toBeVisible();
    }
  }

  async expectFormErrorMessage(message?: string | RegExp) {
    await expect(this.formErrorMessage).toBeVisible();
    if (message) {
      await expect(this.formErrorMessage).toContainText(message);
    }
  }

  async expectRetryButton() {
    await expect(this.retryButton).toBeVisible();
  }

  async expectCreateFormVisible() {
    await expect(this.inlineCreateForm).toBeVisible();
  }

  async expectCreateFormHidden() {
    await expect(this.inlineCreateForm).not.toBeVisible();
  }

  // API Mocking helpers
  async mockBoardsResponse(boards: Array<{ id: string; name: string; description?: string; todoCount?: number; columns?: Array<{ name: string }> }>) {
    await this.page.route('**/api/boards', async (route) => {
      if (route.request().method() === 'GET') {
        const formattedBoards = boards.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description || '',
          columns: b.columns || [],
          todoCount: b.todoCount || 0,
        }));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(formattedBoards),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockEmptyBoards() {
    await this.mockBoardsResponse([]);
  }

  async mockBoardsError(statusCode: number = 500, message: string = 'Internal server error') {
    await this.page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: message }),
      });
    });
  }

  async mockSlowNetwork(delayMs: number = 3000) {
    await this.page.route('**/api/boards', async (route) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  async mockTemplatesResponse(templates: Array<{ id: string; name: string; description?: string; columns: Array<{ name: string }> }>) {
    await this.page.route('**/api/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(templates),
      });
    });
  }

  async mockCreateBoardSuccess(board: { id: string; name: string; columns?: Array<{ id: string; name: string }> }) {
    await this.page.route('**/api/boards', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: board.id,
            name: board.name,
            columns: board.columns || [],
            todoCount: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockCreateBoardError(statusCode: number = 400, message: string = 'Failed to create board') {
    await this.page.route('**/api/boards', async (route) => {
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

  async mockDeleteBoardSuccess() {
    await this.page.route('**/api/boards/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockDeleteBoardError(statusCode: number = 500, message: string = 'Failed to delete board') {
    await this.page.route('**/api/boards/*', async (route) => {
      if (route.request().method() === 'DELETE') {
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
}
