import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import supertest, { Test, SuperTest } from 'supertest';
import { expect } from 'chai';
import { getTestPrisma, testDataFactory } from './test-db';
import {
  ApiHelper,
  createApiHelper,
  apiAssertions,
  testDataGenerators,
  ApiResponse,
  Board,
  Column,
  Todo,
  Label,
  BoardTemplate,
} from './api-helpers';

export interface CustomWorldParameters {
  apiUrl: string;
  testDbUrl?: string;
}

// Local ApiResponse type for backward compatibility
export interface LocalApiResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export class CustomWorld extends World<CustomWorldParameters> {
  // Store the last API response for assertions
  lastResponse: LocalApiResponse | null = null;

  // Store created resources for cleanup
  createdBoardIds: string[] = [];
  createdColumnIds: string[] = [];
  createdTodoIds: string[] = [];
  createdLabelIds: string[] = [];

  // Test data storage
  testData: Record<string, unknown> = {};

  // Flag to skip database cleaning for specific scenarios
  skipDatabaseClean: boolean = false;

  // API helper instance for fluent API calls
  private _api: ApiHelper | null = null;

  constructor(options: IWorldOptions<CustomWorldParameters>) {
    super(options);
  }

  get apiUrl(): string {
    return this.parameters.apiUrl || 'http://localhost:3000';
  }

  /**
   * Get the API helper for making HTTP requests with a fluent interface
   * This is the preferred way to interact with the API in BDD tests
   */
  get api(): ApiHelper {
    if (!this._api) {
      this._api = createApiHelper(this.apiUrl);
    }
    return this._api;
  }

  /**
   * Get assertion helpers for common API response checks
   */
  get assert() {
    return apiAssertions;
  }

  /**
   * Get test data generators for creating test fixtures
   */
  get generate() {
    return testDataGenerators;
  }

  /**
   * Get the test database factory for creating test data directly
   */
  get db() {
    return testDataFactory;
  }

  /**
   * Get the test Prisma client for direct database access
   */
  get prisma() {
    return getTestPrisma();
  }

  /**
   * Create a supertest agent for making HTTP requests
   * @deprecated Use the `api` property instead for a fluent interface
   */
  getRequest(): SuperTest<Test> {
    return supertest(this.apiUrl);
  }

  /**
   * Store an API response for later assertions
   */
  storeResponse(status: number, body: unknown, headers: Record<string, string> = {}): void {
    this.lastResponse = { status, body, headers };
  }

  /**
   * Track a created board for cleanup
   */
  trackBoard(id: string): void {
    this.createdBoardIds.push(id);
  }

  /**
   * Track a created column for cleanup
   */
  trackColumn(id: string): void {
    this.createdColumnIds.push(id);
  }

  /**
   * Track a created todo for cleanup
   */
  trackTodo(id: string): void {
    this.createdTodoIds.push(id);
  }

  /**
   * Track a created label for cleanup
   */
  trackLabel(id: string): void {
    this.createdLabelIds.push(id);
  }

  /**
   * Clean database for scenario isolation (preserves templates)
   * Called before each scenario to ensure clean state
   */
  async cleanDatabaseForScenario(): Promise<void> {
    if (this.skipDatabaseClean) {
      this.skipDatabaseClean = false; // Reset for next scenario
      return;
    }

    const prisma = getTestPrisma();

    // Delete in reverse dependency order (preserving templates)
    await prisma.todo.deleteMany({});
    await prisma.label.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    // Note: We don't delete BoardTemplate - templates are seeded once and reused
  }

  /**
   * Clean up all created resources (in reverse dependency order)
   * Uses API calls for cleanup (useful when testing with running server)
   */
  async cleanup(): Promise<void> {
    const request = this.getRequest();

    // Delete todos first (they depend on columns)
    for (const id of this.createdTodoIds) {
      try {
        await request.delete(`/api/todos/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Delete columns (they depend on boards)
    for (const id of this.createdColumnIds) {
      try {
        await request.delete(`/api/columns/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Delete boards
    for (const id of this.createdBoardIds) {
      try {
        await request.delete(`/api/boards/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Delete labels
    for (const id of this.createdLabelIds) {
      try {
        await request.delete(`/api/labels/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Reset tracking arrays
    this.createdBoardIds = [];
    this.createdColumnIds = [];
    this.createdTodoIds = [];
    this.createdLabelIds = [];
    this.testData = {};
    this.lastResponse = null;
  }

  /**
   * Helper method to create a board directly in the database
   * (for setting up test preconditions)
   */
  async createTestBoard(name: string, options?: { description?: string; templateId?: string }) {
    const board = await testDataFactory.createBoard({
      name,
      description: options?.description,
      templateId: options?.templateId,
    });
    this.createdBoardIds.push(board.id);
    return board;
  }

  /**
   * Helper method to create a column directly in the database
   */
  async createTestColumn(boardId: string, name: string, options?: { position?: number; wipLimit?: number }) {
    const column = await testDataFactory.createColumn({
      name,
      boardId,
      position: options?.position,
      wipLimit: options?.wipLimit,
    });
    this.createdColumnIds.push(column.id);
    return column;
  }

  /**
   * Helper method to create a todo directly in the database
   */
  async createTestTodo(columnId: string, title: string, options?: {
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    position?: number;
  }) {
    const todo = await testDataFactory.createTodo({
      title,
      columnId,
      description: options?.description,
      priority: options?.priority,
      position: options?.position,
    });
    this.createdTodoIds.push(todo.id);
    return todo;
  }

  /**
   * Helper method to create a label directly in the database
   */
  async createTestLabel(name: string, color: string) {
    const label = await testDataFactory.createLabel({ name, color });
    this.createdLabelIds.push(label.id);
    return label;
  }

  /**
   * Helper method to create a complete board with columns and todos
   */
  async createTestBoardWithTodos(name: string, columns: Array<{ name: string; todos: Array<{ title: string }> }>) {
    const board = await testDataFactory.createBoardWithTodos({ name, columns });
    this.createdBoardIds.push(board.id);
    // Track columns and todos for cleanup
    for (const column of board.columns) {
      this.createdColumnIds.push(column.id);
      for (const todo of column.todos) {
        this.createdTodoIds.push(todo.id);
      }
    }
    return board;
  }
}

setWorldConstructor(CustomWorld);

// Export expect for use in step definitions
export { expect };

// Export test data factory for direct use in step definitions
export { testDataFactory };

// Re-export API helper types and utilities for direct use in step definitions
export {
  ApiHelper,
  createApiHelper,
  apiAssertions,
  testDataGenerators,
  ApiResponse,
  Board,
  Column,
  Todo,
  Label,
  BoardTemplate,
} from './api-helpers';

// Re-export payload types for type-safe step definitions
export type {
  CreateBoardPayload,
  UpdateBoardPayload,
  CreateColumnPayload,
  UpdateColumnPayload,
  ReorderColumnsPayload,
  CreateTodoPayload,
  UpdateTodoPayload,
  MoveTodoPayload,
  ReorderTodosPayload,
  ArchiveTodoPayload,
  CreateLabelPayload,
  UpdateLabelPayload,
  TodoFilterParams,
} from './api-helpers';
