import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect, Column, testDataGenerators } from '../support/world';

// ==================== GIVEN STEPS ====================

Given('the board has a column {string}', async function (this: CustomWorld, columnName: string) {
  const boardId = this.testData.boardId as string;
  const column = await this.createTestColumn(boardId, columnName);
  this.testData.columnId = column.id;
  this.testData.columnName = columnName;
});

Given('the board has a column {string} with WIP limit {int}', async function (
  this: CustomWorld,
  columnName: string,
  wipLimit: number
) {
  const boardId = this.testData.boardId as string;
  const column = await this.createTestColumn(boardId, columnName, { wipLimit });
  this.testData.columnId = column.id;
  this.testData.columnName = columnName;
});

Given('the board has a column {string} with description {string}', async function (
  this: CustomWorld,
  columnName: string,
  description: string
) {
  const boardId = this.testData.boardId as string;
  const column = await this.createTestColumn(boardId, columnName, { description });
  this.testData.columnId = column.id;
  this.testData.columnName = columnName;
});

Given('the board has a column {string} with no todos', async function (
  this: CustomWorld,
  columnName: string
) {
  const boardId = this.testData.boardId as string;
  const column = await this.createTestColumn(boardId, columnName);
  this.testData.columnId = column.id;
  this.testData.columnName = columnName;
});

Given('the board has a column {string} with {int} todos', async function (
  this: CustomWorld,
  columnName: string,
  todoCount: number
) {
  const boardId = this.testData.boardId as string;
  const column = await this.createTestColumn(boardId, columnName);
  this.testData.columnId = column.id;
  this.testData.columnName = columnName;

  // Create todos in the column
  const todos = [];
  for (let i = 0; i < todoCount; i++) {
    const todo = await this.createTestTodo(column.id, `Task ${i + 1}`, { position: i });
    todos.push(todo);
  }
  this.testData.todos = todos;
  this.testData.todoCount = todoCount;
});

Given('the board has columns {string}', async function (this: CustomWorld, columnNames: string) {
  const boardId = this.testData.boardId as string;
  const names = columnNames.split(', ');
  const columns: Column[] = [];

  for (let i = 0; i < names.length; i++) {
    const column = await this.createTestColumn(boardId, names[i], { position: i });
    columns.push(column as unknown as Column);
  }

  this.testData.columns = columns;
  // Store the first column as the default
  if (columns.length > 0) {
    this.testData.columnId = columns[0].id;
  }
});

Given('the board has columns {string} in that order', async function (
  this: CustomWorld,
  columnNames: string
) {
  const boardId = this.testData.boardId as string;
  const names = columnNames.split(', ');
  const columns: Column[] = [];

  for (let i = 0; i < names.length; i++) {
    const column = await this.createTestColumn(boardId, names[i], { position: i });
    columns.push(column as unknown as Column);
  }

  this.testData.columns = columns;
  // Create a map for easy lookup by name
  this.testData.columnMap = columns.reduce(
    (map, col) => {
      map[col.name] = col;
      return map;
    },
    {} as Record<string, Column>
  );
});

Given('the column {string} has {int} todos', async function (
  this: CustomWorld,
  columnName: string,
  todoCount: number
) {
  const columns = this.testData.columns as Column[];
  const column = columns.find((c) => c.name === columnName);
  if (!column) {
    throw new Error(`Column "${columnName}" not found`);
  }

  const todos = [];
  for (let i = 0; i < todoCount; i++) {
    const todo = await this.createTestTodo(column.id, `Task ${i + 1}`, { position: i });
    todos.push(todo);
  }
  this.testData.sourceTodos = todos;
  this.testData.sourceColumnId = column.id;
});

Given('a different board {string} exists with column {string}', async function (
  this: CustomWorld,
  boardName: string,
  columnName: string
) {
  const board = await this.createTestBoard(boardName);
  const column = await this.createTestColumn(board.id, columnName);
  this.testData.differentBoardId = board.id;
  this.testData.differentBoardColumnId = column.id;
});

Given('a board {string} exists with columns {string}', async function (
  this: CustomWorld,
  boardName: string,
  columnNames: string
) {
  const board = await this.createTestBoard(boardName);
  const names = columnNames.split(', ');
  const columns: Column[] = [];

  for (let i = 0; i < names.length; i++) {
    const column = await this.createTestColumn(board.id, names[i], { position: i });
    columns.push(column as unknown as Column);
  }

  // Store as Board A or B based on name
  if (boardName === 'Board A') {
    this.testData.boardAId = board.id;
    this.testData.boardAColumns = columns;
  } else {
    this.testData.boardBId = board.id;
    this.testData.boardBColumns = columns;
  }
});

// ==================== WHEN STEPS ====================

When('I PUT to \\/api\\/columns\\/:columnId with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const columnId = this.testData.columnId as string;
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) {
    payload.description = data.description === 'null' ? null : data.description;
  }
  if (data.wipLimit !== undefined) {
    payload.wipLimit = data.wipLimit === 'null' ? null : parseInt(data.wipLimit, 10);
  }

  const response = await this.api.updateColumn(columnId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT \\/api\\/columns\\/{word} with:', async function (
  this: CustomWorld,
  columnId: string,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.wipLimit !== undefined) {
    payload.wipLimit = data.wipLimit === 'null' ? null : parseInt(data.wipLimit, 10);
  }

  const response = await this.api.updateColumn(columnId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to \\/api\\/columns\\/:columnId with name exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const columnId = this.testData.columnId as string;
  const longName = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.updateColumn(columnId, { name: longName });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE the column', async function (this: CustomWorld) {
  const columnId = this.testData.columnId as string;
  const response = await this.api.deleteColumn(columnId);
  this.storeResponse(response.status, response.body, response.headers);
  // Remove from tracking since it's deleted
  this.createdColumnIds = this.createdColumnIds.filter((id) => id !== columnId);
});

When('I DELETE \\/api\\/columns\\/{word}', async function (this: CustomWorld, columnId: string) {
  const response = await this.api.deleteColumn(columnId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE \\/api\\/columns\\/:columnId with moveToColumnId {string}', async function (
  this: CustomWorld,
  targetColumnId: string
) {
  const columnId = this.testData.columnId as string;
  const response = await this.api.deleteColumn(columnId, targetColumnId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE column {string} moving todos to {string}', async function (
  this: CustomWorld,
  sourceColumnName: string,
  targetColumnName: string
) {
  const columns = this.testData.columns as Column[];
  const sourceColumn = columns.find((c) => c.name === sourceColumnName);
  const targetColumn = columns.find((c) => c.name === targetColumnName);

  if (!sourceColumn || !targetColumn) {
    throw new Error(`Column not found: ${sourceColumnName} or ${targetColumnName}`);
  }

  this.testData.sourceColumnId = sourceColumn.id;
  this.testData.targetColumnId = targetColumn.id;

  const response = await this.api.deleteColumn(sourceColumn.id, targetColumn.id);
  this.storeResponse(response.status, response.body, response.headers);

  // Remove from tracking since it's deleted
  this.createdColumnIds = this.createdColumnIds.filter((id) => id !== sourceColumn.id);
});

When('I DELETE column {string} moving todos to column in different board', async function (
  this: CustomWorld,
  sourceColumnName: string
) {
  const columnId = this.testData.columnId as string;
  const targetColumnId = this.testData.differentBoardColumnId as string;

  const response = await this.api.deleteColumn(columnId, targetColumnId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/boards\\/:boardId\\/columns with name exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const boardId = this.testData.boardId as string;
  const longName = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.addColumnToBoard(boardId, { name: longName });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder with new positions:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const boardId = this.testData.boardId as string;
  const columnMap = this.testData.columnMap as Record<string, Column>;
  const rows = dataTable.hashes();

  const columns = rows.map((row) => ({
    id: columnMap[row.column].id,
    position: parseInt(row.newPosition, 10),
  }));

  const response = await this.api.reorderColumns({ boardId, columns });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder to swap {string} and {string}', async function (
  this: CustomWorld,
  column1Name: string,
  column2Name: string
) {
  const boardId = this.testData.boardId as string;
  const columnMap = this.testData.columnMap as Record<string, Column>;

  const columns = [
    { id: columnMap[column1Name].id, position: 1 },
    { id: columnMap[column2Name].id, position: 0 },
  ];

  const response = await this.api.reorderColumns({ boardId, columns });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder with invalid boardId', async function (this: CustomWorld) {
  const columns = this.testData.columns as Column[];

  const response = await this.api.reorderColumns({
    boardId: 'invalid-board-id',
    columns: columns.map((c, i) => ({ id: c.id, position: i })),
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const boardId = data.boardId === 'boardId' ? (this.testData.boardId as string) : data.boardId;

  const response = await this.api.reorderColumns({
    boardId,
    columns: [{ id: 'non-existent-column-id', position: 0 }],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder mixing columns from different boards', async function (
  this: CustomWorld
) {
  const boardAColumns = this.testData.boardAColumns as Column[];
  const boardBColumns = this.testData.boardBColumns as Column[];
  const boardAId = this.testData.boardAId as string;

  // Try to reorder with columns from Board B using Board A's ID
  const response = await this.api.reorderColumns({
    boardId: boardAId,
    columns: [
      { id: boardAColumns[0].id, position: 0 },
      { id: boardBColumns[0].id, position: 1 }, // This column belongs to a different board
    ],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder without boardId', async function (this: CustomWorld) {
  const response = await this.api.patch('/api/columns/reorder', {
    columns: [{ id: 'some-id', position: 0 }],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder with empty columns array', async function (
  this: CustomWorld
) {
  const boardId = this.testData.boardId as string;
  const response = await this.api.reorderColumns({
    boardId,
    columns: [],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/columns\\/reorder with negative position', async function (this: CustomWorld) {
  const boardId = this.testData.boardId as string;
  const columns = this.testData.columns as Column[];

  const response = await this.api.patch('/api/columns/reorder', {
    boardId,
    columns: [{ id: columns[0].id, position: -1 }],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

Then('the column should have an id', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Column;
  expect(body.id).to.be.a('string').and.not.be.empty;
});

Then('the column should have position {int}', function (this: CustomWorld, expectedPosition: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Column;
  expect(body.position).to.equal(expectedPosition);
});

Then('the column WIP limit should be null', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Column;
  expect(body.wipLimit).to.be.null;
});

Then('the column description should be {string}', function (this: CustomWorld, expectedDescription: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Column;
  expect(body.description).to.equal(expectedDescription);
});

Then('the column description should be null', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Column;
  expect(body.description).to.be.null;
});

Then('the column should no longer exist', async function (this: CustomWorld) {
  const columnId = this.testData.columnId as string;
  const response = await this.api.put(`/api/columns/${columnId}`, { name: 'test' });
  expect(response.status).to.equal(404);
});

Then('the todos should be deleted', async function (this: CustomWorld) {
  const todos = this.testData.todos as { id: string }[];
  for (const todo of todos) {
    const response = await this.api.getTodo(todo.id);
    expect(response.status).to.equal(404);
  }
});

Then('the column {string} should no longer exist', async function (
  this: CustomWorld,
  columnName: string
) {
  const columns = this.testData.columns as Column[];
  const column = columns.find((c) => c.name === columnName);
  if (!column) {
    // Already confirmed not to exist if we can't find it
    return;
  }
  const response = await this.api.put(`/api/columns/${column.id}`, { name: 'test' });
  expect(response.status).to.equal(404);
});

Then('the column {string} should have {int} todos', async function (
  this: CustomWorld,
  columnName: string,
  expectedCount: number
) {
  const boardId = this.testData.boardId as string;
  const response = await this.api.getBoard(boardId);
  expect(response.status).to.equal(200);

  const board = response.body;
  const column = board.columns?.find((c) => c.name === columnName);
  expect(column).to.not.be.undefined;
  expect(column!.todos).to.have.lengthOf(expectedCount);
});

Then('the columns should be in order {string}', function (this: CustomWorld, expectedOrder: string) {
  expect(this.lastResponse).to.not.be.null;
  const columns = this.lastResponse!.body as Column[];
  const expectedNames = expectedOrder.split(', ');
  const actualNames = columns.map((col) => col.name);
  expect(actualNames).to.deep.equal(expectedNames);
});

Then('the response should include the column todos', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Column;
  expect(body.todos).to.be.an('array');
});
