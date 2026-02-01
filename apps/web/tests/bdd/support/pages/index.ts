/**
 * Page Objects for BDD Tests
 *
 * Page Objects encapsulate the structure and behavior of web pages,
 * providing a clean API for step definitions to interact with the UI.
 *
 * Usage in step definitions:
 * ```typescript
 * import { BoardListPage, BoardViewPage, TodoModalPage } from '../support/pages';
 *
 * Given('I am on the boards list page', async function(this: CustomWorld) {
 *   const boardListPage = new BoardListPage(this.page);
 *   await boardListPage.goto(this.baseUrl);
 * });
 * ```
 */

export { BoardListPage } from './board-list.page';
export { BoardViewPage } from './board-view.page';
export { TodoModalPage } from './todo-modal.page';
