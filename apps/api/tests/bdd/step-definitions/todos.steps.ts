import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect, Todo, Column, Label, testDataGenerators } from '../support/world';

// ==================== GIVEN STEPS ====================

Given('the column has a todo {string}', async function (this: CustomWorld, todoTitle: string) {
  const columnId = this.testData.columnId as string;
  const todo = await this.createTestTodo(columnId, todoTitle);
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
});

Given('the column has a todo {string} with description {string}', async function (
  this: CustomWorld,
  todoTitle: string,
  description: string
) {
  const columnId = this.testData.columnId as string;
  const todo = await this.createTestTodo(columnId, todoTitle, { description });
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
});

Given('the column has a todo {string} with priority {string}', async function (
  this: CustomWorld,
  todoTitle: string,
  priority: string
) {
  const columnId = this.testData.columnId as string;
  const todo = await this.createTestTodo(columnId, todoTitle, {
    priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
});

Given('the column has a todo {string} with due date', async function (
  this: CustomWorld,
  todoTitle: string
) {
  const columnId = this.testData.columnId as string;
  const prisma = this.prisma;
  const todo = await prisma.todo.create({
    data: {
      title: todoTitle,
      columnId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    include: { labels: true },
  });
  this.trackTodo(todo.id);
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
});

Given('the column has an archived todo {string}', async function (
  this: CustomWorld,
  todoTitle: string
) {
  const columnId = this.testData.columnId as string;
  const prisma = this.prisma;
  const todo = await prisma.todo.create({
    data: {
      title: todoTitle,
      columnId,
      archived: true,
    },
    include: { labels: true },
  });
  this.trackTodo(todo.id);
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
});

Given('the column has todos {string} in order', async function (
  this: CustomWorld,
  todoTitles: string
) {
  const columnId = this.testData.columnId as string;
  const titles = todoTitles.split(', ');
  const todos: Todo[] = [];

  for (let i = 0; i < titles.length; i++) {
    const todo = await this.createTestTodo(columnId, titles[i], { position: i });
    todos.push(todo as unknown as Todo);
  }

  this.testData.todos = todos;
  this.testData.todoMap = todos.reduce(
    (map, todo) => {
      map[todo.title] = todo;
      return map;
    },
    {} as Record<string, Todo>
  );

  // Set the first todo as the default
  if (todos.length > 0) {
    this.testData.todoId = todos[0].id;
  }
});

Given('the column {string} has a todo {string}', async function (
  this: CustomWorld,
  columnName: string,
  todoTitle: string
) {
  const columns = this.testData.columns as Column[];
  const column = columns.find((c) => c.name === columnName);
  if (!column) {
    throw new Error(`Column "${columnName}" not found`);
  }

  const todo = await this.createTestTodo(column.id, todoTitle);
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
  this.testData.todoColumnId = column.id;
});

// Note: "the column {string} has {int} todos" step is defined in columns.steps.ts
// to avoid duplicate step definitions

Given('the column has {int} active todos', async function (this: CustomWorld, todoCount: number) {
  const columnId = this.testData.columnId as string;
  for (let i = 0; i < todoCount; i++) {
    await this.createTestTodo(columnId, `Active Task ${i + 1}`, { position: i });
  }
});

Given('the column has {int} archived todo', async function (this: CustomWorld, todoCount: number) {
  const columnId = this.testData.columnId as string;
  const prisma = this.prisma;

  for (let i = 0; i < todoCount; i++) {
    const todo = await prisma.todo.create({
      data: {
        title: `Archived Task ${i + 1}`,
        columnId,
        archived: true,
        position: 100 + i, // Position after active todos
      },
    });
    this.trackTodo(todo.id);
  }
});

Given('the column has a todo with priority {string}', async function (
  this: CustomWorld,
  priority: string
) {
  const columnId = this.testData.columnId as string;
  const todo = await this.createTestTodo(columnId, `${priority} Priority Task`, {
    priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });
  this.testData.todoId = todo.id;
});

Given('a label {string} with color {string} exists', async function (
  this: CustomWorld,
  labelName: string,
  color: string
) {
  const label = await this.createTestLabel(labelName, color);

  // Store labels in a map for easy lookup
  const labelMap = (this.testData.labelMap as Record<string, Label>) || {};
  labelMap[labelName] = label as unknown as Label;
  this.testData.labelMap = labelMap;

  // Store first label ID for convenience
  if (!this.testData.labelId) {
    this.testData.labelId = label.id;
  }
});

Given('the column has a todo {string} with label {string}', async function (
  this: CustomWorld,
  todoTitle: string,
  labelName: string
) {
  const columnId = this.testData.columnId as string;
  const labelMap = this.testData.labelMap as Record<string, Label>;
  const label = labelMap[labelName];

  if (!label) {
    throw new Error(`Label "${labelName}" not found`);
  }

  const prisma = this.prisma;
  const todo = await prisma.todo.create({
    data: {
      title: todoTitle,
      columnId,
      labels: {
        connect: [{ id: label.id }],
      },
    },
    include: { labels: true },
  });
  this.trackTodo(todo.id);
  this.testData.todoId = todo.id;
  this.testData.todoTitle = todoTitle;
});

Given('the column has a todo {string} without labels', async function (
  this: CustomWorld,
  todoTitle: string
) {
  const columnId = this.testData.columnId as string;
  const todo = await this.createTestTodo(columnId, todoTitle);
  // Don't set as default todo
});

// ==================== WHEN STEPS ====================

When('I GET \\/api\\/todos', async function (this: CustomWorld) {
  const response = await this.api.listTodos();
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/todos\\/{word}', async function (this: CustomWorld, todoId: string) {
  const response = await this.api.getTodo(todoId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET the todo by ID', async function (this: CustomWorld) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.getTodo(todoId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/todos with:', async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) {
    payload.description = data.description === 'null' ? null : data.description;
  }
  if (data.priority !== undefined) payload.priority = data.priority;
  if (data.dueDate !== undefined) {
    if (data.dueDate === 'null') {
      payload.dueDate = null;
    } else if (data.dueDate === 'invalid-date') {
      payload.dueDate = 'invalid-date';
    } else {
      payload.dueDate = new Date(data.dueDate).toISOString();
    }
  }
  if (data.columnId !== undefined) {
    payload.columnId = data.columnId === ':columnId' ? this.testData.columnId : data.columnId;
  }

  const response = await this.api.createTodo(
    payload as { title: string; columnId: string; description?: string; priority?: string }
  );
  this.storeResponse(response.status, response.body, response.headers);

  if (response.status === 201 && response.body.id) {
    this.trackTodo(response.body.id);
    this.testData.todoId = response.body.id;
  }
});

When('I POST to \\/api\\/todos with labels:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const labelMap = this.testData.labelMap as Record<string, Label>;

  const labelNames = data.labels.split(', ');
  const labelIds = labelNames.map((name: string) => {
    const label = labelMap[name];
    if (!label) throw new Error(`Label "${name}" not found`);
    return label.id;
  });

  const payload = {
    title: data.title,
    columnId: data.columnId === ':columnId' ? (this.testData.columnId as string) : data.columnId,
    labelIds,
  };

  const response = await this.api.createTodo(payload);
  this.storeResponse(response.status, response.body, response.headers);

  if (response.status === 201 && response.body.id) {
    this.trackTodo(response.body.id);
    this.testData.todoId = response.body.id;
  }
});

When('I POST to \\/api\\/todos with non-existent labels:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();

  const payload = {
    title: data.title,
    columnId: data.columnId === ':columnId' ? (this.testData.columnId as string) : data.columnId,
    labelIds: [data.labels], // Use the non-existent ID directly
  };

  const response = await this.api.createTodo(payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/todos with title exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const columnId = this.testData.columnId as string;
  const longTitle = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.createTodo({ title: longTitle, columnId });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to \\/api\\/todos\\/:todoId with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const todoId = this.testData.todoId as string;
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) {
    payload.description = data.description === 'null' ? null : data.description;
  }
  if (data.priority !== undefined) payload.priority = data.priority;
  if (data.dueDate !== undefined) {
    if (data.dueDate === 'null') {
      payload.dueDate = null;
    } else {
      payload.dueDate = new Date(data.dueDate).toISOString();
    }
  }

  const response = await this.api.updateTodo(todoId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT \\/api\\/todos\\/{word} with:', async function (
  this: CustomWorld,
  todoId: string,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) {
    payload.description = data.description === 'null' ? null : data.description;
  }
  if (data.priority !== undefined) payload.priority = data.priority;

  const response = await this.api.updateTodo(todoId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to \\/api\\/todos\\/:todoId with title exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const todoId = this.testData.todoId as string;
  const longTitle = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.updateTodo(todoId, { title: longTitle });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE the todo', async function (this: CustomWorld) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.deleteTodo(todoId);
  this.storeResponse(response.status, response.body, response.headers);
  this.createdTodoIds = this.createdTodoIds.filter((id) => id !== todoId);
});

When('I DELETE \\/api\\/todos\\/{word}', async function (this: CustomWorld, todoId: string) {
  const response = await this.api.deleteTodo(todoId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/:todoId\\/move to column {string}', async function (
  this: CustomWorld,
  targetColumnName: string
) {
  const todoId = this.testData.todoId as string;
  const columns = this.testData.columns as Column[];
  const targetColumn = columns.find((c) => c.name === targetColumnName);

  if (!targetColumn) {
    throw new Error(`Column "${targetColumnName}" not found`);
  }

  const response = await this.api.moveTodo(todoId, { columnId: targetColumn.id });
  this.storeResponse(response.status, response.body, response.headers);
});

When(
  'I PATCH \\/api\\/todos\\/:todoId\\/move to column {string} at position {int}',
  async function (this: CustomWorld, targetColumnName: string, position: number) {
    const todoId = this.testData.todoId as string;
    const columns = this.testData.columns as Column[];
    const targetColumn = columns.find((c) => c.name === targetColumnName);

    if (!targetColumn) {
      throw new Error(`Column "${targetColumnName}" not found`);
    }

    const response = await this.api.moveTodo(todoId, { columnId: targetColumn.id, position });
    this.storeResponse(response.status, response.body, response.headers);
  }
);

When('I PATCH to move the todo with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const todoId = this.testData.todoId as string;
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.columnId !== undefined) payload.columnId = data.columnId;
  if (data.position !== undefined) payload.position = parseInt(data.position, 10);

  const response = await this.api.moveTodo(todoId, payload as { columnId: string; position?: number });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/{word}\\/move with:', async function (
  this: CustomWorld,
  todoId: string,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.columnId !== undefined) payload.columnId = data.columnId;
  if (data.position !== undefined) payload.position = parseInt(data.position, 10);

  const response = await this.api.moveTodo(todoId, payload as { columnId: string; position?: number });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/reorder with new positions:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const columnId = this.testData.columnId as string;
  const todoMap = this.testData.todoMap as Record<string, Todo>;
  const rows = dataTable.hashes();

  const todos = rows.map((row) => ({
    id: todoMap[row.todo].id,
    position: parseInt(row.newPosition, 10),
  }));

  const response = await this.api.reorderTodos({ columnId, todos });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/reorder with invalid columnId', async function (this: CustomWorld) {
  const todos = this.testData.todos as Todo[];

  const response = await this.api.reorderTodos({
    columnId: 'invalid-column-id',
    todos: todos.map((t, i) => ({ id: t.id, position: i })),
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/reorder with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const columnId = data.columnId === ':columnId' ? (this.testData.columnId as string) : data.columnId;

  const response = await this.api.reorderTodos({
    columnId,
    todos: [{ id: 'non-existent-todo-id', position: 0 }],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/reorder mixing todos from different columns', async function (
  this: CustomWorld
) {
  const columns = this.testData.columns as Column[];
  const firstColumnId = columns[0].id;

  // Get todos from different columns (they were created in Given steps)
  const response = await this.api.reorderTodos({
    columnId: firstColumnId,
    todos: [
      { id: this.testData.todoId as string, position: 0 }, // This todo might be from different column
    ],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/reorder without columnId', async function (this: CustomWorld) {
  const response = await this.api.patch('/api/todos/reorder', {
    todos: [{ id: 'some-id', position: 0 }],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/reorder with negative position', async function (this: CustomWorld) {
  const columnId = this.testData.columnId as string;
  const todos = this.testData.todos as Todo[];

  const response = await this.api.patch('/api/todos/reorder', {
    columnId,
    todos: [{ id: todos[0].id, position: -1 }],
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/:todoId\\/archive with archived true', async function (
  this: CustomWorld
) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.archiveTodo(todoId, { archived: true });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/:todoId\\/archive with archived false', async function (
  this: CustomWorld
) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.archiveTodo(todoId, { archived: false });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/{word}\\/archive with:', async function (
  this: CustomWorld,
  todoId: string,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload = { archived: data.archived === 'true' };
  const response = await this.api.archiveTodo(todoId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PATCH \\/api\\/todos\\/:todoId\\/archive without archived field', async function (
  this: CustomWorld
) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.patch(`/api/todos/${todoId}/archive`, {});
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/todos filtered by column {string}', async function (
  this: CustomWorld,
  columnName: string
) {
  const columns = this.testData.columns as Column[];
  const column = columns.find((c) => c.name === columnName);
  if (!column) {
    throw new Error(`Column "${columnName}" not found`);
  }

  const response = await this.api.listTodos({ columnId: column.id });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/todos filtered by archived true', async function (this: CustomWorld) {
  const response = await this.api.listTodos({ archived: true });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/todos filtered by priority {string}', async function (
  this: CustomWorld,
  priority: string
) {
  const response = await this.api.listTodos({
    priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/todos filtered by label {string}', async function (
  this: CustomWorld,
  labelName: string
) {
  const labelMap = this.testData.labelMap as Record<string, Label>;
  const label = labelMap[labelName];
  if (!label) {
    throw new Error(`Label "${labelName}" not found`);
  }

  const response = await this.api.listTodos({ labelId: label.id });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/todos with search query {string}', async function (
  this: CustomWorld,
  query: string
) {
  const response = await this.api.listTodos({ search: query });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I update the todo to add label {string}', async function (
  this: CustomWorld,
  labelName: string
) {
  const todoId = this.testData.todoId as string;
  const labelMap = this.testData.labelMap as Record<string, Label>;
  const label = labelMap[labelName];

  if (!label) {
    throw new Error(`Label "${labelName}" not found`);
  }

  const response = await this.api.updateTodo(todoId, { labelIds: [label.id] });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I update the todo to remove all labels', async function (this: CustomWorld) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.updateTodo(todoId, { labelIds: [] });
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

Then('the response should contain {int} todos', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array').with.lengthOf(count);
});

Then('the response should include a todo titled {string}', function (
  this: CustomWorld,
  todoTitle: string
) {
  expect(this.lastResponse).to.not.be.null;
  const todos = this.lastResponse!.body as Todo[];
  const found = todos.some((todo) => todo.title === todoTitle);
  expect(found).to.be.true;
});

Then('the response should contain the todo title {string}', function (
  this: CustomWorld,
  todoTitle: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.title).to.equal(todoTitle);
});

Then('the todo should have an id', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.id).to.be.a('string').and.not.be.empty;
});

Then('the todo should have priority {string}', function (this: CustomWorld, priority: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body;

  // Handle both single todo response and array response
  if (Array.isArray(body)) {
    // If it's an array, check the first todo
    expect(body.length).to.be.greaterThan(0);
    expect((body[0] as Todo).priority).to.equal(priority);
  } else {
    expect((body as Todo).priority).to.equal(priority);
  }
});

Then('the todo should not be archived', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.archived).to.be.false;
});

Then('the todo should be archived', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.archived).to.be.true;
});

Then('the todo should have a due date', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.dueDate).to.not.be.null;
});

Then('the todo due date should be null', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.dueDate).to.be.null;
});

Then('the todo description should be null', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.description).to.be.null;
});

Then('the todo should have {int} labels', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.labels).to.be.an('array').with.lengthOf(count);
});

Then('the todo should have label {string}', function (this: CustomWorld, labelName: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  const found = body.labels?.some((label) => label.name === labelName);
  expect(found).to.be.true;
});

Then('the response should include the column info', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.column).to.not.be.undefined;
  expect(body.column!.id).to.be.a('string');
});

Then('the todo should no longer exist', async function (this: CustomWorld) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.getTodo(todoId);
  expect(response.status).to.equal(404);
});

Then('the todo should be in column {string}', async function (
  this: CustomWorld,
  columnName: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  const columns = this.testData.columns as Column[];
  const targetColumn = columns.find((c) => c.name === columnName);
  expect(targetColumn).to.not.be.undefined;
  expect(body.columnId).to.equal(targetColumn!.id);
});

Then('the todo should have position {int}', function (this: CustomWorld, expectedPosition: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Todo;
  expect(body.position).to.equal(expectedPosition);
});

Then('the todos should be in order {string}', function (this: CustomWorld, expectedOrder: string) {
  expect(this.lastResponse).to.not.be.null;
  const todos = this.lastResponse!.body as Todo[];
  const expectedTitles = expectedOrder.split(', ');
  const actualTitles = todos.map((todo) => todo.title);
  expect(actualTitles).to.deep.equal(expectedTitles);
});
