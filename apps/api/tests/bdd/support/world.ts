import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import supertest, { Test, SuperTest } from 'supertest';
import { expect } from 'chai';

export interface CustomWorldParameters {
  apiUrl: string;
  testDbUrl?: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export class CustomWorld extends World<CustomWorldParameters> {
  // Store the last API response for assertions
  lastResponse: ApiResponse | null = null;

  // Store created resources for cleanup
  createdBoardIds: string[] = [];
  createdColumnIds: string[] = [];
  createdTodoIds: string[] = [];
  createdLabelIds: string[] = [];

  // Test data storage
  testData: Record<string, unknown> = {};

  constructor(options: IWorldOptions<CustomWorldParameters>) {
    super(options);
  }

  get apiUrl(): string {
    return this.parameters.apiUrl || 'http://localhost:3000';
  }

  /**
   * Create a supertest agent for making HTTP requests
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
   * Clean up all created resources (in reverse dependency order)
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
}

setWorldConstructor(CustomWorld);

// Export expect for use in step definitions
export { expect };
