/**
 * API Helpers for Backend BDD Tests
 *
 * Provides a fluent, type-safe interface for making API requests in BDD tests.
 * Supports all InZone API endpoints with proper request/response handling.
 */

import supertest, { Test, SuperTest, Response } from 'supertest';

// Type definitions for API payloads
export interface CreateBoardPayload {
  name: string;
  description?: string;
  templateId?: string;
}

export interface UpdateBoardPayload {
  name?: string;
  description?: string | null;
  position?: number;
}

export interface CreateColumnPayload {
  name: string;
  wipLimit?: number;
}

export interface UpdateColumnPayload {
  name?: string;
  description?: string | null;
  wipLimit?: number | null;
}

export interface ReorderColumnsPayload {
  boardId: string;
  columns: Array<{ id: string; position: number }>;
}

export interface CreateTodoPayload {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  columnId: string;
  labelIds?: string[];
}

export interface UpdateTodoPayload {
  title?: string;
  description?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  labelIds?: string[];
}

export interface MoveTodoPayload {
  columnId: string;
  position?: number;
}

export interface ReorderTodosPayload {
  columnId: string;
  todos: Array<{ id: string; position: number }>;
}

export interface ArchiveTodoPayload {
  archived: boolean;
}

export interface CreateLabelPayload {
  name: string;
  color: string;
}

export interface UpdateLabelPayload {
  name?: string;
  color?: string;
}

export interface TodoFilterParams {
  columnId?: string;
  boardId?: string;
  archived?: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  labelId?: string;
  search?: string;
}

// Response type definitions
export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  templateId?: string | null;
  columns?: Column[];
  todoCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  wipLimit?: number | null;
  boardId: string;
  todos?: Todo[];
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  position: number;
  archived: boolean;
  columnId: string;
  labels?: Label[];
  column?: { id: string; name: string; boardId: string };
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  _count?: { todos: number };
}

export interface BoardTemplate {
  id: string;
  name: string;
  description?: string | null;
  columns: Array<{ name: string; wipLimit?: number }>;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  errors: Array<{
    code: string;
    message: string;
    path: string[];
  }>;
}

export interface ApiError {
  error: string;
}

/**
 * API Helper class for making HTTP requests to the InZone API
 * Provides a fluent interface for all API operations
 */
export class ApiHelper {
  private request: SuperTest<Test>;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.request = supertest(baseUrl);
  }

  /**
   * Convert supertest response to ApiResponse
   */
  private toApiResponse<T>(response: Response): ApiResponse<T> {
    return {
      status: response.status,
      body: response.body as T,
      headers: response.headers as Record<string, string>,
    };
  }

  // ==================== Board Endpoints ====================

  /**
   * GET /api/boards - List all boards
   */
  async listBoards(): Promise<ApiResponse<Board[]>> {
    const response = await this.request.get('/api/boards');
    return this.toApiResponse<Board[]>(response);
  }

  /**
   * POST /api/boards - Create a new board
   */
  async createBoard(data: CreateBoardPayload): Promise<ApiResponse<Board>> {
    const response = await this.request
      .post('/api/boards')
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Board>(response);
  }

  /**
   * GET /api/boards/:id - Get board by ID
   */
  async getBoard(id: string): Promise<ApiResponse<Board>> {
    const response = await this.request.get(`/api/boards/${id}`);
    return this.toApiResponse<Board>(response);
  }

  /**
   * PUT /api/boards/:id - Update board
   */
  async updateBoard(id: string, data: UpdateBoardPayload): Promise<ApiResponse<Board>> {
    const response = await this.request
      .put(`/api/boards/${id}`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Board>(response);
  }

  /**
   * DELETE /api/boards/:id - Delete board
   */
  async deleteBoard(id: string): Promise<ApiResponse<void>> {
    const response = await this.request.delete(`/api/boards/${id}`);
    return this.toApiResponse<void>(response);
  }

  /**
   * POST /api/boards/:id/duplicate - Duplicate board
   */
  async duplicateBoard(id: string): Promise<ApiResponse<Board>> {
    const response = await this.request.post(`/api/boards/${id}/duplicate`);
    return this.toApiResponse<Board>(response);
  }

  /**
   * POST /api/boards/:boardId/columns - Add column to board
   */
  async addColumnToBoard(boardId: string, data: CreateColumnPayload): Promise<ApiResponse<Column>> {
    const response = await this.request
      .post(`/api/boards/${boardId}/columns`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Column>(response);
  }

  // ==================== Column Endpoints ====================

  /**
   * PUT /api/columns/:id - Update column
   */
  async updateColumn(id: string, data: UpdateColumnPayload): Promise<ApiResponse<Column>> {
    const response = await this.request
      .put(`/api/columns/${id}`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Column>(response);
  }

  /**
   * DELETE /api/columns/:id - Delete column
   * @param moveToColumnId - Optional column ID to move todos to before deletion
   */
  async deleteColumn(id: string, moveToColumnId?: string): Promise<ApiResponse<void>> {
    let url = `/api/columns/${id}`;
    if (moveToColumnId) {
      url += `?moveToColumnId=${moveToColumnId}`;
    }
    const response = await this.request.delete(url);
    return this.toApiResponse<void>(response);
  }

  /**
   * PATCH /api/columns/reorder - Reorder columns
   */
  async reorderColumns(data: ReorderColumnsPayload): Promise<ApiResponse<Column[]>> {
    const response = await this.request
      .patch('/api/columns/reorder')
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Column[]>(response);
  }

  // ==================== Todo Endpoints ====================

  /**
   * GET /api/todos - List todos with optional filters
   */
  async listTodos(filters?: TodoFilterParams): Promise<ApiResponse<Todo[]>> {
    let url = '/api/todos';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.columnId) params.append('columnId', filters.columnId);
      if (filters.boardId) params.append('boardId', filters.boardId);
      if (filters.archived !== undefined) params.append('archived', String(filters.archived));
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.labelId) params.append('labelId', filters.labelId);
      if (filters.search) params.append('search', filters.search);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    const response = await this.request.get(url);
    return this.toApiResponse<Todo[]>(response);
  }

  /**
   * POST /api/todos - Create a new todo
   */
  async createTodo(data: CreateTodoPayload): Promise<ApiResponse<Todo>> {
    const response = await this.request
      .post('/api/todos')
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Todo>(response);
  }

  /**
   * GET /api/todos/:id - Get todo by ID
   */
  async getTodo(id: string): Promise<ApiResponse<Todo>> {
    const response = await this.request.get(`/api/todos/${id}`);
    return this.toApiResponse<Todo>(response);
  }

  /**
   * PUT /api/todos/:id - Update todo
   */
  async updateTodo(id: string, data: UpdateTodoPayload): Promise<ApiResponse<Todo>> {
    const response = await this.request
      .put(`/api/todos/${id}`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Todo>(response);
  }

  /**
   * DELETE /api/todos/:id - Delete todo
   */
  async deleteTodo(id: string): Promise<ApiResponse<void>> {
    const response = await this.request.delete(`/api/todos/${id}`);
    return this.toApiResponse<void>(response);
  }

  /**
   * PATCH /api/todos/:id/move - Move todo to another column
   */
  async moveTodo(id: string, data: MoveTodoPayload): Promise<ApiResponse<Todo>> {
    const response = await this.request
      .patch(`/api/todos/${id}/move`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Todo>(response);
  }

  /**
   * PATCH /api/todos/reorder - Reorder todos within a column
   */
  async reorderTodos(data: ReorderTodosPayload): Promise<ApiResponse<Todo[]>> {
    const response = await this.request
      .patch('/api/todos/reorder')
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Todo[]>(response);
  }

  /**
   * PATCH /api/todos/:id/archive - Archive or unarchive a todo
   */
  async archiveTodo(id: string, data: ArchiveTodoPayload): Promise<ApiResponse<Todo>> {
    const response = await this.request
      .patch(`/api/todos/${id}/archive`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Todo>(response);
  }

  // ==================== Label Endpoints ====================

  /**
   * GET /api/labels - List all labels
   */
  async listLabels(): Promise<ApiResponse<Label[]>> {
    const response = await this.request.get('/api/labels');
    return this.toApiResponse<Label[]>(response);
  }

  /**
   * POST /api/labels - Create a new label
   */
  async createLabel(data: CreateLabelPayload): Promise<ApiResponse<Label>> {
    const response = await this.request
      .post('/api/labels')
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Label>(response);
  }

  /**
   * GET /api/labels/:id - Get label by ID
   */
  async getLabel(id: string): Promise<ApiResponse<Label>> {
    const response = await this.request.get(`/api/labels/${id}`);
    return this.toApiResponse<Label>(response);
  }

  /**
   * PUT /api/labels/:id - Update label
   */
  async updateLabel(id: string, data: UpdateLabelPayload): Promise<ApiResponse<Label>> {
    const response = await this.request
      .put(`/api/labels/${id}`)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<Label>(response);
  }

  /**
   * DELETE /api/labels/:id - Delete label
   */
  async deleteLabel(id: string): Promise<ApiResponse<void>> {
    const response = await this.request.delete(`/api/labels/${id}`);
    return this.toApiResponse<void>(response);
  }

  // ==================== Template Endpoints ====================

  /**
   * GET /api/templates - List all templates
   */
  async listTemplates(): Promise<ApiResponse<BoardTemplate[]>> {
    const response = await this.request.get('/api/templates');
    return this.toApiResponse<BoardTemplate[]>(response);
  }

  /**
   * GET /api/templates/:id - Get template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<BoardTemplate>> {
    const response = await this.request.get(`/api/templates/${id}`);
    return this.toApiResponse<BoardTemplate>(response);
  }

  // ==================== Health Check ====================

  /**
   * GET /health - Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    const response = await this.request.get('/health');
    return this.toApiResponse<{ status: string; timestamp: string }>(response);
  }

  // ==================== Raw Request Methods ====================

  /**
   * Make a raw GET request
   */
  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const response = await this.request.get(path);
    return this.toApiResponse<T>(response);
  }

  /**
   * Make a raw POST request
   */
  async post<T = unknown>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.request
      .post(path)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<T>(response);
  }

  /**
   * Make a raw PUT request
   */
  async put<T = unknown>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.request
      .put(path)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<T>(response);
  }

  /**
   * Make a raw PATCH request
   */
  async patch<T = unknown>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.request
      .patch(path)
      .send(data)
      .set('Content-Type', 'application/json');
    return this.toApiResponse<T>(response);
  }

  /**
   * Make a raw DELETE request
   */
  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const response = await this.request.delete(path);
    return this.toApiResponse<T>(response);
  }

  /**
   * Make a request with invalid JSON to test error handling
   */
  async postInvalidJson(path: string): Promise<ApiResponse<unknown>> {
    const response = await this.request
      .post(path)
      .set('Content-Type', 'application/json')
      .send('invalid json');
    return this.toApiResponse<unknown>(response);
  }
}

/**
 * Create an API helper instance
 */
export function createApiHelper(baseUrl?: string): ApiHelper {
  return new ApiHelper(baseUrl);
}

/**
 * Assertion helpers for common API response checks
 */
export const apiAssertions = {
  /**
   * Assert response status is 200 OK
   */
  isOk(response: ApiResponse<unknown>): void {
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
  },

  /**
   * Assert response status is 201 Created
   */
  isCreated(response: ApiResponse<unknown>): void {
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
  },

  /**
   * Assert response status is 204 No Content
   */
  isNoContent(response: ApiResponse<unknown>): void {
    if (response.status !== 204) {
      throw new Error(`Expected status 204, got ${response.status}`);
    }
  },

  /**
   * Assert response status is 400 Bad Request
   */
  isBadRequest(response: ApiResponse<unknown>): void {
    if (response.status !== 400) {
      throw new Error(`Expected status 400, got ${response.status}`);
    }
  },

  /**
   * Assert response status is 404 Not Found
   */
  isNotFound(response: ApiResponse<unknown>): void {
    if (response.status !== 404) {
      throw new Error(`Expected status 404, got ${response.status}`);
    }
  },

  /**
   * Assert response status is 500 Internal Server Error
   */
  isServerError(response: ApiResponse<unknown>): void {
    if (response.status !== 500) {
      throw new Error(`Expected status 500, got ${response.status}`);
    }
  },

  /**
   * Assert response has specific status code
   */
  hasStatus(response: ApiResponse<unknown>, expectedStatus: number): void {
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
  },

  /**
   * Assert response body contains a specific field
   */
  hasField(response: ApiResponse<unknown>, field: string): void {
    if (!(field in (response.body as Record<string, unknown>))) {
      throw new Error(`Expected response body to have field '${field}'`);
    }
  },

  /**
   * Assert response body is an array
   */
  isArray(response: ApiResponse<unknown>): void {
    if (!Array.isArray(response.body)) {
      throw new Error('Expected response body to be an array');
    }
  },

  /**
   * Assert response body array has specific length
   */
  hasLength(response: ApiResponse<unknown[]>, expectedLength: number): void {
    if (!Array.isArray(response.body)) {
      throw new Error('Expected response body to be an array');
    }
    if (response.body.length !== expectedLength) {
      throw new Error(`Expected array length ${expectedLength}, got ${response.body.length}`);
    }
  },

  /**
   * Assert response body contains error message
   */
  hasErrorMessage(response: ApiResponse<unknown>, expectedMessage?: string): void {
    const body = response.body as Record<string, unknown>;
    if (!('error' in body) && !('errors' in body)) {
      throw new Error('Expected response body to have error or errors field');
    }
    if (expectedMessage && body.error !== expectedMessage) {
      throw new Error(`Expected error message '${expectedMessage}', got '${body.error}'`);
    }
  },
};

/**
 * Test data generators for creating test fixtures
 */
export const testDataGenerators = {
  /**
   * Generate a unique board name
   */
  boardName(prefix: string = 'Test Board'): string {
    return `${prefix} ${Date.now()}`;
  },

  /**
   * Generate a unique column name
   */
  columnName(prefix: string = 'Column'): string {
    return `${prefix} ${Date.now()}`;
  },

  /**
   * Generate a unique todo title
   */
  todoTitle(prefix: string = 'Todo'): string {
    return `${prefix} ${Date.now()}`;
  },

  /**
   * Generate a unique label name
   */
  labelName(prefix: string = 'Label'): string {
    return `${prefix} ${Date.now()}`;
  },

  /**
   * Generate a random hex color
   */
  hexColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  },

  /**
   * Generate a future date string
   */
  futureDate(daysFromNow: number = 7): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  },

  /**
   * Generate a past date string
   */
  pastDate(daysAgo: number = 7): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  },

  /**
   * Generate a long string for testing length limits
   */
  longString(length: number): string {
    return 'A'.repeat(length);
  },
};
