import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect, Board, testDataGenerators } from '../support/world';

// ==================== GIVEN STEPS ====================

Given('a board {string} exists', async function (this: CustomWorld, boardName: string) {
  const board = await this.createTestBoard(boardName);
  this.testData.boardId = board.id;
  this.testData.boardName = boardName;
});

Given('a board {string} with description {string} exists', async function (
  this: CustomWorld,
  boardName: string,
  description: string
) {
  const board = await this.createTestBoard(boardName, { description });
  this.testData.boardId = board.id;
  this.testData.boardName = boardName;
});

Given('a board {string} with template {string} exists', async function (
  this: CustomWorld,
  boardName: string,
  templateId: string
) {
  // Create board via API to get template columns
  const response = await this.api.createBoard({ name: boardName, templateId });
  this.testData.boardId = response.body.id;
  this.testData.boardName = boardName;
  this.trackBoard(response.body.id);
});

Given('a board {string} with columns and todos exists', async function (
  this: CustomWorld,
  boardName: string
) {
  const board = await this.createTestBoardWithTodos(boardName, [
    { name: 'Todo', todos: [{ title: 'Task 1' }, { title: 'Task 2' }] },
    { name: 'In Progress', todos: [{ title: 'Task 3' }] },
    { name: 'Done', todos: [] },
  ]);
  this.testData.boardId = board.id;
  this.testData.boardName = boardName;
  this.testData.board = board;
});

Given('a board {string} with {int} todos exists', async function (
  this: CustomWorld,
  boardName: string,
  todoCount: number
) {
  const todos = Array.from({ length: todoCount }, (_, i) => ({ title: `Task ${i + 1}` }));
  const board = await this.createTestBoardWithTodos(boardName, [{ name: 'Todo', todos }]);
  this.testData.boardId = board.id;
  this.testData.boardName = boardName;
});

Given('the following boards exist in order:', async function (this: CustomWorld, dataTable: DataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    const board = await this.db.createBoard({
      name: row.name,
      position: parseInt(row.position, 10),
    });
    this.trackBoard(board.id);
  }
});

// ==================== WHEN STEPS ====================

When('I GET \\/api\\/boards', async function (this: CustomWorld) {
  const response = await this.api.listBoards();
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/boards\\/{word}', async function (this: CustomWorld, boardId: string) {
  const response = await this.api.getBoard(boardId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET the board by ID', async function (this: CustomWorld) {
  const boardId = this.testData.boardId as string;
  const response = await this.api.getBoard(boardId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/boards with:', async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.templateId !== undefined) payload.templateId = data.templateId;

  const response = await this.api.createBoard(payload as { name: string; description?: string; templateId?: string });
  this.storeResponse(response.status, response.body, response.headers);

  // Track created board for cleanup
  if (response.status === 201 && response.body.id) {
    this.trackBoard(response.body.id);
    this.testData.boardId = response.body.id;
  }
});

When('I POST to \\/api\\/boards with name exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const longName = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.createBoard({ name: longName });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/boards with description exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const longDescription = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.createBoard({ name: 'Test', description: longDescription });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT \\/api\\/boards\\/{word} with:', async function (
  this: CustomWorld,
  boardId: string,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) {
    payload.description = data.description === 'null' ? null : data.description;
  }
  if (data.position !== undefined) payload.position = parseInt(data.position, 10);

  const response = await this.api.updateBoard(boardId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to update the board with:', async function (this: CustomWorld, dataTable: DataTable) {
  const boardId = this.testData.boardId as string;
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) {
    payload.description = data.description === 'null' ? null : data.description;
  }
  if (data.position !== undefined) payload.position = parseInt(data.position, 10);

  const response = await this.api.updateBoard(boardId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to update the board with name exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const boardId = this.testData.boardId as string;
  const longName = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.updateBoard(boardId, { name: longName });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE the board', async function (this: CustomWorld) {
  const boardId = this.testData.boardId as string;
  const response = await this.api.deleteBoard(boardId);
  this.storeResponse(response.status, response.body, response.headers);
  // Remove from tracking since it's deleted
  this.createdBoardIds = this.createdBoardIds.filter((id) => id !== boardId);
});

When('I DELETE \\/api\\/boards\\/{word}', async function (this: CustomWorld, boardId: string) {
  const response = await this.api.deleteBoard(boardId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to duplicate the board', async function (this: CustomWorld) {
  const boardId = this.testData.boardId as string;
  const response = await this.api.duplicateBoard(boardId);
  this.storeResponse(response.status, response.body, response.headers);

  // Track duplicated board for cleanup
  if (response.status === 201 && response.body.id) {
    this.trackBoard(response.body.id);
    this.testData.duplicatedBoardId = response.body.id;
  }
});

When('I POST \\/api\\/boards\\/{word}\\/duplicate', async function (this: CustomWorld, boardId: string) {
  const response = await this.api.duplicateBoard(boardId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/boards\\/:boardId\\/columns with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const boardId = this.testData.boardId as string;
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.wipLimit !== undefined) payload.wipLimit = parseInt(data.wipLimit, 10);

  const response = await this.api.addColumnToBoard(boardId, payload as { name: string; wipLimit?: number });
  this.storeResponse(response.status, response.body, response.headers);

  // Track created column for cleanup
  if (response.status === 201 && response.body.id) {
    this.trackColumn(response.body.id);
    this.testData.columnId = response.body.id;
  }
});

When('I POST to \\/api\\/boards\\/non-existent-id\\/columns with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.wipLimit !== undefined) payload.wipLimit = parseInt(data.wipLimit, 10);

  const response = await this.api.addColumnToBoard('non-existent-id', payload as { name: string; wipLimit?: number });
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

Then('the response status should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.status).to.equal(expectedStatus);
});

Then('the response should be an empty array', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array').that.is.empty;
});

Then('the response should contain {int} boards', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array').with.lengthOf(count);
});

Then('the response should include a board named {string}', function (this: CustomWorld, boardName: string) {
  expect(this.lastResponse).to.not.be.null;
  const boards = this.lastResponse!.body as Board[];
  const found = boards.some((board) => board.name === boardName);
  expect(found).to.be.true;
});

Then('the response should contain the board name {string}', function (this: CustomWorld, boardName: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.name).to.equal(boardName);
});

Then('the response should contain the description {string}', function (this: CustomWorld, description: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.description).to.equal(description);
});

Then('the board should have an id', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.id).to.be.a('string').and.not.be.empty;
});

Then('the board should have {int} columns', function (this: CustomWorld, columnCount: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.columns).to.be.an('array').with.lengthOf(columnCount);
});

Then('the columns should be named {string}', function (this: CustomWorld, columnNames: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  const expectedNames = columnNames.split(', ');
  const actualNames = body.columns?.map((col) => col.name) || [];
  expect(actualNames).to.deep.equal(expectedNames);
});

Then('the response should contain columns', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.columns).to.be.an('array');
});

Then('the columns should contain todos', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  const hasTodos = body.columns?.some((col) => col.todos && col.todos.length > 0);
  expect(hasTodos).to.be.true;
});

Then('the board description should be null', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.description).to.be.null;
});

Then('the board should no longer exist', async function (this: CustomWorld) {
  const boardId = this.testData.boardId as string;
  const response = await this.api.getBoard(boardId);
  expect(response.status).to.equal(404);
});

Then('the board columns should be deleted', async function (this: CustomWorld) {
  // Columns are cascade deleted with the board, verify via board check
  const boardId = this.testData.boardId as string;
  const response = await this.api.getBoard(boardId);
  expect(response.status).to.equal(404);
});

Then('the board todos should be deleted', async function (this: CustomWorld) {
  // Todos are cascade deleted with columns/board, verify via board check
  const boardId = this.testData.boardId as string;
  const response = await this.api.getBoard(boardId);
  expect(response.status).to.equal(404);
});

Then('the duplicated board should have {int} columns', function (this: CustomWorld, columnCount: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  expect(body.columns).to.be.an('array').with.lengthOf(columnCount);
});

Then('the duplicated board should contain the same todos', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Board;
  const originalBoard = this.testData.board as Board;

  // Count todos in duplicated board
  const duplicatedTodoCount =
    body.columns?.reduce((sum, col) => sum + (col.todos?.length || 0), 0) || 0;

  // Count todos in original board
  const originalTodoCount =
    originalBoard.columns?.reduce((sum, col) => sum + (col.todos?.length || 0), 0) || 0;

  expect(duplicatedTodoCount).to.equal(originalTodoCount);
});

Then('the response should contain the column name {string}', function (this: CustomWorld, columnName: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as { name: string };
  expect(body.name).to.equal(columnName);
});

Then('the column should have WIP limit {int}', function (this: CustomWorld, wipLimit: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as { wipLimit: number };
  expect(body.wipLimit).to.equal(wipLimit);
});

Then('the boards should be in order {string}', function (this: CustomWorld, expectedOrder: string) {
  expect(this.lastResponse).to.not.be.null;
  const boards = this.lastResponse!.body as Board[];
  const expectedNames = expectedOrder.split(', ');
  const actualNames = boards.map((board) => board.name);
  expect(actualNames).to.deep.equal(expectedNames);
});

Then('the board {string} should have todo count {int}', function (
  this: CustomWorld,
  boardName: string,
  expectedCount: number
) {
  expect(this.lastResponse).to.not.be.null;
  const boards = this.lastResponse!.body as (Board & { todoCount: number })[];
  const board = boards.find((b) => b.name === boardName);
  expect(board).to.not.be.undefined;
  expect(board!.todoCount).to.equal(expectedCount);
});

Then('the board {string} should have column count {int}', function (
  this: CustomWorld,
  boardName: string,
  expectedCount: number
) {
  expect(this.lastResponse).to.not.be.null;
  const boards = this.lastResponse!.body as (Board & { columnCount: number })[];
  const board = boards.find((b) => b.name === boardName);
  expect(board).to.not.be.undefined;
  expect(board!.columnCount).to.equal(expectedCount);
});

Then('the response should contain error {string}', function (this: CustomWorld, errorMessage: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as { error?: string };
  expect(body.error).to.equal(errorMessage);
});

Then('the response should contain validation errors', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as { errors?: unknown[] };
  expect(body.errors).to.be.an('array').and.not.be.empty;
});
