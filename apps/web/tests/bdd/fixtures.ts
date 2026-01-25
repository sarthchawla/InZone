import { test as base } from 'playwright-bdd';
import { BoardListPage } from './support/pages/board-list.page';
import { BoardViewPage } from './support/pages/board-view.page';
import { TodoModalPage } from './support/pages/todo-modal.page';

/**
 * Custom fixtures for Playwright-BDD tests
 * Replaces the CustomWorld from Cucumber.js integration
 */
type Fixtures = {
  boardListPage: BoardListPage;
  boardViewPage: BoardViewPage;
  todoModalPage: TodoModalPage;
  baseUrl: string;
  apiUrl: string;
};

export const test = base.extend<Fixtures>({
  baseUrl: [process.env.BASE_URL || 'http://localhost:5173', { option: true }],
  apiUrl: [process.env.API_URL || 'http://localhost:3000', { option: true }],

  boardListPage: async ({ page }, use) => {
    await use(new BoardListPage(page));
  },

  boardViewPage: async ({ page }, use) => {
    await use(new BoardViewPage(page));
  },

  todoModalPage: async ({ page }, use) => {
    await use(new TodoModalPage(page));
  },
});

export { expect } from '@playwright/test';
