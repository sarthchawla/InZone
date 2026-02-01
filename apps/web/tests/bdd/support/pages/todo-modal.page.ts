import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Todo Modal (create/edit todo)
 * Handles todo creation and editing operations
 */
export class TodoModalPage {
  readonly page: Page;

  // Modal container
  readonly modal: Locator;

  // Form input locators
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly prioritySelect: Locator;
  readonly dueDateInput: Locator;
  readonly labelSelector: Locator;

  // Button locators
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  // Error display
  readonly errorMessage: Locator;

  // Label management within modal
  readonly selectedLabels: Locator;
  readonly availableLabels: Locator;

  constructor(page: Page) {
    this.page = page;

    // Modal container
    this.modal = page.getByRole('dialog');

    // Form inputs
    this.titleInput = page.getByLabel(/title/i);
    this.descriptionInput = page.getByLabel(/description/i);
    this.prioritySelect = page.getByLabel(/priority/i);
    this.dueDateInput = page.getByLabel(/due date/i);
    this.labelSelector = page.locator('[data-testid="label-selector"]');

    // Buttons
    this.saveButton = page.getByRole('button', { name: /save|create|add/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });

    // Error display
    this.errorMessage = page.locator('[data-testid="error-message"], .bg-red-50');

    // Labels
    this.selectedLabels = page.locator('[data-testid="selected-labels"]');
    this.availableLabels = page.locator('[data-testid="available-labels"]');
  }

  // Modal state
  async isOpen(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  async waitForModal() {
    await this.modal.waitFor({ state: 'visible' });
  }

  async waitForModalClose() {
    await this.modal.waitFor({ state: 'hidden' });
  }

  // Form operations
  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async clearTitle() {
    await this.titleInput.clear();
  }

  async fillDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  async clearDescription() {
    await this.descriptionInput.clear();
  }

  async selectPriority(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') {
    await this.prioritySelect.selectOption(priority);
  }

  async fillDueDate(date: string | Date) {
    const dateString = date instanceof Date
      ? date.toISOString().split('T')[0]
      : date;
    await this.dueDateInput.fill(dateString);
  }

  async clearDueDate() {
    await this.dueDateInput.clear();
  }

  // Label operations
  async toggleLabel(labelName: string) {
    const labelButton = this.page.locator(`[data-testid="label-option"]:has-text("${labelName}")`);
    await labelButton.click();
  }

  async selectLabel(labelName: string) {
    const label = this.availableLabels.locator(`button:has-text("${labelName}")`);
    await label.click();
  }

  async deselectLabel(labelName: string) {
    const label = this.selectedLabels.locator(`button:has-text("${labelName}")`);
    await label.click();
  }

  async getSelectedLabelNames(): Promise<string[]> {
    const labels = this.selectedLabels.locator('[data-testid="label"]');
    return await labels.allTextContents();
  }

  // Form submission
  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
    await this.waitForModalClose();
  }

  async delete() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    await this.page.getByRole('button', { name: /confirm|yes|delete/i }).click();
  }

  async cancelDelete() {
    await this.page.getByRole('button', { name: /cancel|no/i }).click();
  }

  // Complete form operations
  async createTodo(options: {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate?: string | Date;
    labels?: string[];
  }) {
    await this.fillTitle(options.title);

    if (options.description) {
      await this.fillDescription(options.description);
    }

    if (options.priority) {
      await this.selectPriority(options.priority);
    }

    if (options.dueDate) {
      await this.fillDueDate(options.dueDate);
    }

    if (options.labels && options.labels.length > 0) {
      for (const label of options.labels) {
        await this.toggleLabel(label);
      }
    }

    await this.save();
  }

  async editTodo(options: {
    title?: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate?: string | Date;
    labels?: string[];
  }) {
    if (options.title !== undefined) {
      await this.clearTitle();
      await this.fillTitle(options.title);
    }

    if (options.description !== undefined) {
      await this.clearDescription();
      if (options.description) {
        await this.fillDescription(options.description);
      }
    }

    if (options.priority) {
      await this.selectPriority(options.priority);
    }

    if (options.dueDate !== undefined) {
      await this.clearDueDate();
      if (options.dueDate) {
        await this.fillDueDate(options.dueDate);
      }
    }

    await this.save();
  }

  // Assertions
  async expectModalOpen() {
    await expect(this.modal).toBeVisible();
  }

  async expectModalClosed() {
    await expect(this.modal).not.toBeVisible();
  }

  async expectTitle(title: string) {
    await expect(this.titleInput).toHaveValue(title);
  }

  async expectDescription(description: string) {
    await expect(this.descriptionInput).toHaveValue(description);
  }

  async expectPriority(priority: string) {
    await expect(this.prioritySelect).toHaveValue(priority);
  }

  async expectDueDate(date: string) {
    await expect(this.dueDateInput).toHaveValue(date);
  }

  async expectLabelSelected(labelName: string) {
    const label = this.page.locator(`[data-testid="selected-label"]:has-text("${labelName}")`);
    await expect(label).toBeVisible();
  }

  async expectLabelNotSelected(labelName: string) {
    const label = this.page.locator(`[data-testid="selected-label"]:has-text("${labelName}")`);
    await expect(label).not.toBeVisible();
  }

  async expectErrorMessage(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectNoErrorMessage() {
    await expect(this.errorMessage).not.toBeVisible();
  }

  async expectTitleError(message?: string | RegExp) {
    const error = this.page.locator('[data-testid="title-error"]');
    await expect(error).toBeVisible();
    if (message) {
      await expect(error).toContainText(message);
    }
  }

  async expectSaveButtonDisabled() {
    await expect(this.saveButton).toBeDisabled();
  }

  async expectSaveButtonEnabled() {
    await expect(this.saveButton).toBeEnabled();
  }

  async expectDeleteButtonVisible() {
    await expect(this.deleteButton).toBeVisible();
  }

  async expectDeleteButtonHidden() {
    await expect(this.deleteButton).not.toBeVisible();
  }

  // Inline add card form operations (for quick add within column)
  readonly inlineAddForm: Locator = this.page.locator('[data-testid="inline-add-form"]');
  readonly inlineAddInput: Locator = this.page.getByPlaceholder(/enter todo title|add a card/i);
  readonly inlineAddButton: Locator = this.page.getByRole('button', { name: /^add$|add card/i });
  readonly inlineAddCancelButton: Locator = this.page.locator('[data-testid="inline-add-cancel"]');

  async fillInlineTitle(title: string) {
    await this.inlineAddInput.fill(title);
  }

  async submitInlineAdd() {
    await this.inlineAddButton.click();
  }

  async cancelInlineAdd() {
    await this.inlineAddCancelButton.click();
  }

  async quickAddTodo(title: string) {
    await this.fillInlineTitle(title);
    await this.submitInlineAdd();
  }

  // API Mocking helpers
  async mockTodoCreateSuccess() {
    await this.page.route('**/api/todos', async (route) => {
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
  }

  async mockTodoCreateError(statusCode: number = 400, message: string = 'Failed to create todo') {
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

  async mockTodoUpdateSuccess() {
    await this.page.route('**/api/todos/*', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...body,
            updatedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockTodoUpdateError(statusCode: number = 400, message: string = 'Failed to update todo') {
    await this.page.route('**/api/todos/*', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
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

  async mockTodoDeleteSuccess() {
    await this.page.route('**/api/todos/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockTodoDeleteError(statusCode: number = 500, message: string = 'Failed to delete todo') {
    await this.page.route('**/api/todos/*', async (route) => {
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
