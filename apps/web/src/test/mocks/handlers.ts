import { http, HttpResponse } from "msw";
import type { Board, Column, Todo, Label, BoardTemplate } from "../../types";

// Mock data factory functions
export const createMockBoard = (overrides: Partial<Board> = {}): Board => ({
  id: `board-${Date.now()}`,
  name: "Test Board",
  description: "A test board",
  position: 0,
  userId: 'test-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  columns: [],
  todoCount: 0,
  ...overrides,
});

export const createMockColumn = (overrides: Partial<Column> = {}): Column => ({
  id: `column-${Date.now()}`,
  name: "Test Column",
  position: 0,
  boardId: "board-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  todos: [],
  ...overrides,
});

export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: `todo-${Date.now()}`,
  title: "Test Todo",
  description: "A test todo",
  priority: "MEDIUM",
  position: 0,
  archived: false,
  columnId: "column-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  labels: [],
  ...overrides,
});

export const createMockLabel = (overrides: Partial<Label> = {}): Label => ({
  id: `label-${Date.now()}`,
  name: "Test Label",
  color: "#FF5733",
  ...overrides,
});

export const createMockTemplate = (
  overrides: Partial<BoardTemplate> = {}
): BoardTemplate => ({
  id: `template-${Date.now()}`,
  name: "Test Template",
  description: "A test template",
  columns: [{ name: "Todo" }, { name: "In Progress" }, { name: "Done" }],
  isBuiltIn: true,
  ...overrides,
});

// Default mock data
export const mockBoards: Board[] = [
  createMockBoard({
    id: "board-1",
    name: "Project Alpha",
    description: "Main project board",
    position: 0,
    todoCount: 5,
    columns: [
      createMockColumn({
        id: "column-1",
        name: "Todo",
        position: 0,
        boardId: "board-1",
      }),
      createMockColumn({
        id: "column-2",
        name: "In Progress",
        position: 1,
        boardId: "board-1",
      }),
      createMockColumn({
        id: "column-3",
        name: "Done",
        position: 2,
        boardId: "board-1",
      }),
    ],
  }),
  createMockBoard({
    id: "board-2",
    name: "Personal Tasks",
    description: "Personal task tracking",
    position: 1,
    todoCount: 3,
  }),
];

export const mockLabels: Label[] = [
  createMockLabel({ id: "label-1", name: "Bug", color: "#FF0000" }),
  createMockLabel({ id: "label-2", name: "Feature", color: "#00FF00" }),
  createMockLabel({ id: "label-3", name: "Urgent", color: "#FFA500" }),
];

export const mockTemplates: BoardTemplate[] = [
  createMockTemplate({
    id: "kanban-basic",
    name: "Basic Kanban",
    description: "Simple three-column Kanban board",
    columns: [{ name: "Todo" }, { name: "In Progress" }, { name: "Done" }],
  }),
  createMockTemplate({
    id: "dev-workflow",
    name: "Development",
    description: "Software development workflow",
    columns: [
      { name: "Backlog" },
      { name: "Todo" },
      { name: "In Progress" },
      { name: "Review" },
      { name: "Done" },
    ],
  }),
  createMockTemplate({
    id: "simple",
    name: "Simple",
    description: "Minimal two-column setup",
    columns: [{ name: "Todo" }, { name: "Done" }],
  }),
];

// API handlers
export const handlers = [
  // Boards
  http.get(`/api/boards`, () => {
    return HttpResponse.json(mockBoards);
  }),

  http.get(`/api/boards/:id`, ({ params }) => {
    const board = mockBoards.find((b) => b.id === params.id);
    if (!board) {
      return HttpResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return HttpResponse.json(board);
  }),

  http.post(`/api/boards`, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string; templateId?: string };
    if (!body.name) {
      return HttpResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const newBoard = createMockBoard({
      name: body.name,
      description: body.description,
      templateId: body.templateId,
    });
    return HttpResponse.json(newBoard, { status: 201 });
  }),

  http.put(`/api/boards/:id`, async ({ params, request }) => {
    const board = mockBoards.find((b) => b.id === params.id);
    if (!board) {
      return HttpResponse.json({ error: "Board not found" }, { status: 404 });
    }
    const body = (await request.json()) as { name?: string; description?: string };
    return HttpResponse.json({ ...board, ...body });
  }),

  http.delete(`/api/boards/:id`, ({ params }) => {
    const board = mockBoards.find((b) => b.id === params.id);
    if (!board) {
      return HttpResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Columns
  http.post(`/api/boards/:boardId/columns`, async ({ params, request }) => {
    const board = mockBoards.find((b) => b.id === params.boardId);
    if (!board) {
      return HttpResponse.json({ error: "Board not found" }, { status: 404 });
    }
    const body = (await request.json()) as { name: string; wipLimit?: number };
    if (!body.name) {
      return HttpResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const newColumn = createMockColumn({
      name: body.name,
      wipLimit: body.wipLimit,
      boardId: params.boardId as string,
    });
    return HttpResponse.json(newColumn, { status: 201 });
  }),

  http.put(`/api/columns/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { name?: string; wipLimit?: number };
    const column = createMockColumn({
      id: params.id as string,
      ...body,
    });
    return HttpResponse.json(column);
  }),

  http.delete(`/api/columns/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`/api/columns/reorder`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Todos
  http.get(`/api/todos`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`/api/todos`, async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      columnId: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      labelIds?: string[];
    };
    if (!body.title) {
      return HttpResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!body.columnId) {
      return HttpResponse.json(
        { error: "Column ID is required" },
        { status: 400 }
      );
    }
    const newTodo = createMockTodo({
      title: body.title,
      description: body.description,
      columnId: body.columnId,
      priority: (body.priority as Todo["priority"]) || "MEDIUM",
      dueDate: body.dueDate,
      labels: body.labelIds
        ? mockLabels.filter((l) => body.labelIds?.includes(l.id))
        : [],
    });
    return HttpResponse.json(newTodo, { status: 201 });
  }),

  http.get(`/api/todos/:id`, ({ params }) => {
    const todo = createMockTodo({ id: params.id as string });
    return HttpResponse.json(todo);
  }),

  http.put(`/api/todos/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Todo>;
    const todo = createMockTodo({
      id: params.id as string,
      ...body,
    });
    return HttpResponse.json(todo);
  }),

  http.delete(`/api/todos/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`/api/todos/:id/move`, async ({ params, request }) => {
    const body = (await request.json()) as { columnId: string; position: number };
    const todo = createMockTodo({
      id: params.id as string,
      columnId: body.columnId,
      position: body.position,
    });
    return HttpResponse.json(todo);
  }),

  http.patch(`/api/todos/reorder`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.patch(`/api/todos/:id/archive`, async ({ params, request }) => {
    const body = (await request.json()) as { archived: boolean };
    const todo = createMockTodo({
      id: params.id as string,
      archived: body.archived,
    });
    return HttpResponse.json(todo);
  }),

  // Labels
  http.get(`/api/labels`, () => {
    return HttpResponse.json(mockLabels);
  }),

  http.get(`/api/labels/:id`, ({ params }) => {
    const label = mockLabels.find((l) => l.id === params.id);
    if (!label) {
      return HttpResponse.json({ error: "Label not found" }, { status: 404 });
    }
    return HttpResponse.json(label);
  }),

  http.post(`/api/labels`, async ({ request }) => {
    const body = (await request.json()) as { name: string; color: string };
    if (!body.name) {
      return HttpResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!body.color) {
      return HttpResponse.json(
        { error: "Color is required" },
        { status: 400 }
      );
    }
    const newLabel = createMockLabel(body);
    return HttpResponse.json(newLabel, { status: 201 });
  }),

  http.put(`/api/labels/:id`, async ({ params, request }) => {
    const label = mockLabels.find((l) => l.id === params.id);
    if (!label) {
      return HttpResponse.json({ error: "Label not found" }, { status: 404 });
    }
    const body = (await request.json()) as { name?: string; color?: string };
    return HttpResponse.json({ ...label, ...body });
  }),

  http.delete(`/api/labels/:id`, ({ params }) => {
    const label = mockLabels.find((l) => l.id === params.id);
    if (!label) {
      return HttpResponse.json({ error: "Label not found" }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Templates
  http.get(`/api/templates`, () => {
    return HttpResponse.json(mockTemplates);
  }),

  // Search
  http.get(`/api/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    if (!query) {
      return HttpResponse.json([]);
    }
    // Mock search results
    return HttpResponse.json([
      createMockTodo({ title: `Search result for: ${query}` }),
    ]);
  }),
];
