/**
 * Unit tests for domain-specific Zod validation schemas
 *
 * Tests both happy path (valid input) and unhappy path (invalid input) scenarios
 * for all validators used in the InZone API.
 */
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  // Board validators
  createBoardSchema,
  updateBoardSchema,
  // Column validators
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
  // Todo validators
  createTodoSchema,
  updateTodoSchema,
  moveTodoSchema,
  reorderTodosSchema,
  archiveTodoSchema,
  // Label validators
  createLabelSchema,
  updateLabelSchema,
  HEX_COLOR_PATTERN,
} from './index.js';

// ============================================================================
// Board Validators Tests
// ============================================================================

describe('Board Validators', () => {
  describe('createBoardSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts valid board with required fields only', () => {
        const input = { name: 'My Board' };
        const result = createBoardSchema.parse(input);
        expect(result).toEqual({ name: 'My Board' });
      });

      it('accepts valid board with all fields', () => {
        const input = {
          name: 'My Board',
          description: 'A test board',
          templateId: 'kanban-basic',
        };
        const result = createBoardSchema.parse(input);
        expect(result).toEqual(input);
      });

      it('accepts board name at max length (100 chars)', () => {
        const input = { name: 'A'.repeat(100) };
        expect(() => createBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts description at max length (500 chars)', () => {
        const input = {
          name: 'Test',
          description: 'B'.repeat(500),
        };
        expect(() => createBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts empty description', () => {
        const input = { name: 'Test', description: '' };
        expect(() => createBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts special characters in name', () => {
        const input = { name: 'Board #1: Test & Dev (2025)' };
        expect(() => createBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts unicode characters in name', () => {
        const input = { name: '開発ボード 日本語テスト' };
        expect(() => createBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts emoji in name', () => {
        const input = { name: '🚀 Launch Board' };
        expect(() => createBoardSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing name', () => {
        const input = { description: 'Test' };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty name', () => {
        const input = { name: '' };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
        try {
          createBoardSchema.parse(input);
        } catch (error) {
          if (error instanceof ZodError) {
            expect(error.errors[0].message).toContain('required');
          }
        }
      });

      it('rejects name exceeding max length', () => {
        const input = { name: 'A'.repeat(101) };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
        try {
          createBoardSchema.parse(input);
        } catch (error) {
          if (error instanceof ZodError) {
            expect(error.errors[0].message).toContain('100');
          }
        }
      });

      it('rejects description exceeding max length', () => {
        const input = { name: 'Test', description: 'B'.repeat(501) };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects non-string name', () => {
        const input = { name: 123 };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects null name', () => {
        const input = { name: null };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects array as name', () => {
        const input = { name: ['Board'] };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects object as name', () => {
        const input = { name: { value: 'Board' } };
        expect(() => createBoardSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('updateBoardSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts empty object (no updates)', () => {
        const input = {};
        const result = updateBoardSchema.parse(input);
        expect(result).toEqual({});
      });

      it('accepts partial update with name only', () => {
        const input = { name: 'Updated Name' };
        const result = updateBoardSchema.parse(input);
        expect(result).toEqual({ name: 'Updated Name' });
      });

      it('accepts partial update with description only', () => {
        const input = { description: 'New description' };
        expect(() => updateBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts null description to clear it', () => {
        const input = { description: null };
        const result = updateBoardSchema.parse(input);
        expect(result.description).toBeNull();
      });

      it('accepts position update', () => {
        const input = { position: 5 };
        const result = updateBoardSchema.parse(input);
        expect(result.position).toBe(5);
      });

      it('accepts position of 0', () => {
        const input = { position: 0 };
        expect(() => updateBoardSchema.parse(input)).not.toThrow();
      });

      it('accepts all fields together', () => {
        const input = {
          name: 'New Name',
          description: 'New desc',
          position: 3,
        };
        expect(() => updateBoardSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects empty name when provided', () => {
        const input = { name: '' };
        expect(() => updateBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects name exceeding max length', () => {
        const input = { name: 'A'.repeat(101) };
        expect(() => updateBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects description exceeding max length', () => {
        const input = { description: 'B'.repeat(501) };
        expect(() => updateBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects negative position', () => {
        const input = { position: -1 };
        expect(() => updateBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects non-integer position', () => {
        const input = { position: 3.5 };
        expect(() => updateBoardSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects string position', () => {
        const input = { position: '3' };
        expect(() => updateBoardSchema.parse(input)).toThrow(ZodError);
      });
    });
  });
});

// ============================================================================
// Column Validators Tests
// ============================================================================

describe('Column Validators', () => {
  describe('createColumnSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts valid column with name only', () => {
        const input = { name: 'Todo' };
        const result = createColumnSchema.parse(input);
        expect(result).toEqual({ name: 'Todo' });
      });

      it('accepts column with WIP limit', () => {
        const input = { name: 'In Progress', wipLimit: 5 };
        const result = createColumnSchema.parse(input);
        expect(result).toEqual({ name: 'In Progress', wipLimit: 5 });
      });

      it('accepts WIP limit of 1', () => {
        const input = { name: 'Test', wipLimit: 1 };
        expect(() => createColumnSchema.parse(input)).not.toThrow();
      });

      it('accepts large WIP limit', () => {
        const input = { name: 'Test', wipLimit: 1000 };
        expect(() => createColumnSchema.parse(input)).not.toThrow();
      });

      it('accepts name at max length (100 chars)', () => {
        const input = { name: 'C'.repeat(100) };
        expect(() => createColumnSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing name', () => {
        const input = { wipLimit: 5 };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty name', () => {
        const input = { name: '' };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects name exceeding max length', () => {
        const input = { name: 'C'.repeat(101) };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects WIP limit of 0', () => {
        const input = { name: 'Test', wipLimit: 0 };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects negative WIP limit', () => {
        const input = { name: 'Test', wipLimit: -1 };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects non-integer WIP limit', () => {
        const input = { name: 'Test', wipLimit: 2.5 };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects string WIP limit', () => {
        const input = { name: 'Test', wipLimit: '5' };
        expect(() => createColumnSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('updateColumnSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts empty object', () => {
        const input = {};
        expect(() => updateColumnSchema.parse(input)).not.toThrow();
      });

      it('accepts name update', () => {
        const input = { name: 'New Name' };
        expect(() => updateColumnSchema.parse(input)).not.toThrow();
      });

      it('accepts WIP limit update', () => {
        const input = { wipLimit: 10 };
        expect(() => updateColumnSchema.parse(input)).not.toThrow();
      });

      it('accepts null WIP limit to remove it', () => {
        const input = { wipLimit: null };
        const result = updateColumnSchema.parse(input);
        expect(result.wipLimit).toBeNull();
      });

      it('accepts both name and WIP limit', () => {
        const input = { name: 'Updated', wipLimit: 3 };
        expect(() => updateColumnSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects empty name when provided', () => {
        const input = { name: '' };
        expect(() => updateColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects WIP limit of 0', () => {
        const input = { wipLimit: 0 };
        expect(() => updateColumnSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects negative WIP limit', () => {
        const input = { wipLimit: -5 };
        expect(() => updateColumnSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('reorderColumnsSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts valid reorder request', () => {
        const input = {
          boardId: 'board-123',
          columns: [
            { id: 'col-1', position: 0 },
            { id: 'col-2', position: 1 },
            { id: 'col-3', position: 2 },
          ],
        };
        expect(() => reorderColumnsSchema.parse(input)).not.toThrow();
      });

      it('accepts single column reorder', () => {
        const input = {
          boardId: 'board-123',
          columns: [{ id: 'col-1', position: 0 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).not.toThrow();
      });

      it('accepts non-sequential positions', () => {
        const input = {
          boardId: 'board-123',
          columns: [
            { id: 'col-1', position: 0 },
            { id: 'col-2', position: 5 },
            { id: 'col-3', position: 10 },
          ],
        };
        expect(() => reorderColumnsSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing boardId', () => {
        const input = {
          columns: [{ id: 'col-1', position: 0 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty boardId', () => {
        const input = {
          boardId: '',
          columns: [{ id: 'col-1', position: 0 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty columns array', () => {
        const input = {
          boardId: 'board-123',
          columns: [],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects missing column id', () => {
        const input = {
          boardId: 'board-123',
          columns: [{ position: 0 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty column id', () => {
        const input = {
          boardId: 'board-123',
          columns: [{ id: '', position: 0 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects missing position', () => {
        const input = {
          boardId: 'board-123',
          columns: [{ id: 'col-1' }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects negative position', () => {
        const input = {
          boardId: 'board-123',
          columns: [{ id: 'col-1', position: -1 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects non-integer position', () => {
        const input = {
          boardId: 'board-123',
          columns: [{ id: 'col-1', position: 1.5 }],
        };
        expect(() => reorderColumnsSchema.parse(input)).toThrow(ZodError);
      });
    });
  });
});

// ============================================================================
// Todo Validators Tests
// ============================================================================

describe('Todo Validators', () => {
  describe('createTodoSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts valid todo with required fields only', () => {
        const input = { title: 'Buy groceries', columnId: 'col-1' };
        const result = createTodoSchema.parse(input);
        expect(result.title).toBe('Buy groceries');
        expect(result.columnId).toBe('col-1');
      });

      it('accepts todo with all fields', () => {
        const input = {
          title: 'Review PR',
          description: 'Check the auth module changes',
          priority: 'HIGH',
          dueDate: '2025-02-01T00:00:00.000Z',
          columnId: 'col-1',
          labelIds: ['label-1', 'label-2'],
        };
        expect(() => createTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts all priority values', () => {
        const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        priorities.forEach((priority) => {
          const input = { title: 'Test', columnId: 'col-1', priority };
          expect(() => createTodoSchema.parse(input)).not.toThrow();
        });
      });

      it('accepts null dueDate', () => {
        const input = { title: 'Test', columnId: 'col-1', dueDate: null };
        expect(() => createTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts empty labelIds array', () => {
        const input = { title: 'Test', columnId: 'col-1', labelIds: [] };
        expect(() => createTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts title at max length (200 chars)', () => {
        const input = { title: 'T'.repeat(200), columnId: 'col-1' };
        expect(() => createTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts description at max length (5000 chars)', () => {
        const input = {
          title: 'Test',
          columnId: 'col-1',
          description: 'D'.repeat(5000),
        };
        expect(() => createTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts valid ISO 8601 date formats', () => {
        const validDates = [
          '2025-01-24T10:30:00.000Z',
          '2025-12-31T23:59:59.999Z',
          '2025-01-01T00:00:00Z',
        ];
        validDates.forEach((dueDate) => {
          const input = { title: 'Test', columnId: 'col-1', dueDate };
          expect(() => createTodoSchema.parse(input)).not.toThrow();
        });
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing title', () => {
        const input = { columnId: 'col-1' };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty title', () => {
        const input = { title: '', columnId: 'col-1' };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects title exceeding max length', () => {
        const input = { title: 'T'.repeat(201), columnId: 'col-1' };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects missing columnId', () => {
        const input = { title: 'Test' };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty columnId', () => {
        const input = { title: 'Test', columnId: '' };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects invalid priority', () => {
        const input = { title: 'Test', columnId: 'col-1', priority: 'INVALID' };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects description exceeding max length', () => {
        const input = {
          title: 'Test',
          columnId: 'col-1',
          description: 'D'.repeat(5001),
        };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects invalid date format', () => {
        const invalidDates = [
          '2025-01-24',
          '01/24/2025',
          'tomorrow',
          'not-a-date',
          '2025-13-01T00:00:00Z', // Invalid month
        ];
        invalidDates.forEach((dueDate) => {
          const input = { title: 'Test', columnId: 'col-1', dueDate };
          expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
        });
      });

      it('rejects empty string in labelIds array', () => {
        const input = { title: 'Test', columnId: 'col-1', labelIds: ['label-1', ''] };
        expect(() => createTodoSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('updateTodoSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts empty object', () => {
        const input = {};
        expect(() => updateTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts partial update with title only', () => {
        const input = { title: 'Updated title' };
        expect(() => updateTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts null description to clear it', () => {
        const input = { description: null };
        const result = updateTodoSchema.parse(input);
        expect(result.description).toBeNull();
      });

      it('accepts null dueDate to clear it', () => {
        const input = { dueDate: null };
        const result = updateTodoSchema.parse(input);
        expect(result.dueDate).toBeNull();
      });

      it('accepts priority update', () => {
        const input = { priority: 'URGENT' };
        expect(() => updateTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts labelIds update', () => {
        const input = { labelIds: ['label-1', 'label-2'] };
        expect(() => updateTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts all fields together', () => {
        const input = {
          title: 'Updated',
          description: 'New description',
          priority: 'HIGH',
          dueDate: '2025-03-01T00:00:00Z',
          labelIds: ['label-1'],
        };
        expect(() => updateTodoSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects empty title when provided', () => {
        const input = { title: '' };
        expect(() => updateTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects title exceeding max length', () => {
        const input = { title: 'T'.repeat(201) };
        expect(() => updateTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects invalid priority', () => {
        const input = { priority: 'CRITICAL' };
        expect(() => updateTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects invalid date format', () => {
        const input = { dueDate: '2025-01-24' };
        expect(() => updateTodoSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('moveTodoSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts columnId only', () => {
        const input = { columnId: 'col-2' };
        expect(() => moveTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts columnId with position', () => {
        const input = { columnId: 'col-2', position: 3 };
        expect(() => moveTodoSchema.parse(input)).not.toThrow();
      });

      it('accepts position of 0', () => {
        const input = { columnId: 'col-2', position: 0 };
        expect(() => moveTodoSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing columnId', () => {
        const input = { position: 0 };
        expect(() => moveTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty columnId', () => {
        const input = { columnId: '' };
        expect(() => moveTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects negative position', () => {
        const input = { columnId: 'col-2', position: -1 };
        expect(() => moveTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects non-integer position', () => {
        const input = { columnId: 'col-2', position: 2.5 };
        expect(() => moveTodoSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('reorderTodosSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts valid reorder request', () => {
        const input = {
          columnId: 'col-1',
          todos: [
            { id: 'todo-1', position: 0 },
            { id: 'todo-2', position: 1 },
          ],
        };
        expect(() => reorderTodosSchema.parse(input)).not.toThrow();
      });

      it('accepts single todo reorder', () => {
        const input = {
          columnId: 'col-1',
          todos: [{ id: 'todo-1', position: 0 }],
        };
        expect(() => reorderTodosSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing columnId', () => {
        const input = {
          todos: [{ id: 'todo-1', position: 0 }],
        };
        expect(() => reorderTodosSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty columnId', () => {
        const input = {
          columnId: '',
          todos: [{ id: 'todo-1', position: 0 }],
        };
        expect(() => reorderTodosSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty todos array', () => {
        const input = {
          columnId: 'col-1',
          todos: [],
        };
        expect(() => reorderTodosSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty todo id', () => {
        const input = {
          columnId: 'col-1',
          todos: [{ id: '', position: 0 }],
        };
        expect(() => reorderTodosSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects negative position', () => {
        const input = {
          columnId: 'col-1',
          todos: [{ id: 'todo-1', position: -1 }],
        };
        expect(() => reorderTodosSchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  describe('archiveTodoSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts archived true', () => {
        const input = { archived: true };
        const result = archiveTodoSchema.parse(input);
        expect(result.archived).toBe(true);
      });

      it('accepts archived false', () => {
        const input = { archived: false };
        const result = archiveTodoSchema.parse(input);
        expect(result.archived).toBe(false);
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing archived field', () => {
        const input = {};
        expect(() => archiveTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects null archived', () => {
        const input = { archived: null };
        expect(() => archiveTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects string "true"', () => {
        const input = { archived: 'true' };
        expect(() => archiveTodoSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects number 1', () => {
        const input = { archived: 1 };
        expect(() => archiveTodoSchema.parse(input)).toThrow(ZodError);
      });
    });
  });
});

// ============================================================================
// Label Validators Tests
// ============================================================================

describe('Label Validators', () => {
  describe('HEX_COLOR_PATTERN', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('matches valid 6-digit hex colors', () => {
        const validColors = [
          '#FF0000',
          '#00FF00',
          '#0000FF',
          '#FFFFFF',
          '#000000',
          '#ff5733',
          '#AbCdEf',
        ];
        validColors.forEach((color) => {
          expect(HEX_COLOR_PATTERN.test(color)).toBe(true);
        });
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects invalid hex formats', () => {
        const invalidColors = [
          'FF0000', // Missing #
          '#FFF', // 3-digit (not supported in this schema)
          '#FFFFFFF', // Too long
          '#GGGGGG', // Invalid hex chars
          'red', // Named color
          '#FF00', // 4 digits
          '##FF0000', // Double #
          '#FF 000', // Space
        ];
        invalidColors.forEach((color) => {
          expect(HEX_COLOR_PATTERN.test(color)).toBe(false);
        });
      });
    });
  });

  describe('createLabelSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts valid label', () => {
        const input = { name: 'Bug', color: '#FF0000' };
        const result = createLabelSchema.parse(input);
        expect(result).toEqual({ name: 'Bug', color: '#FF0000' });
      });

      it('accepts lowercase hex color', () => {
        const input = { name: 'Feature', color: '#00ff00' };
        expect(() => createLabelSchema.parse(input)).not.toThrow();
      });

      it('accepts mixed case hex color', () => {
        const input = { name: 'Test', color: '#aAbBcC' };
        expect(() => createLabelSchema.parse(input)).not.toThrow();
      });

      it('accepts name at max length (50 chars)', () => {
        const input = { name: 'L'.repeat(50), color: '#FF0000' };
        expect(() => createLabelSchema.parse(input)).not.toThrow();
      });

      it('accepts special characters in name', () => {
        const input = { name: 'Bug (Critical!)', color: '#FF0000' };
        expect(() => createLabelSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects missing name', () => {
        const input = { color: '#FF0000' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects empty name', () => {
        const input = { name: '', color: '#FF0000' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects name exceeding max length', () => {
        const input = { name: 'L'.repeat(51), color: '#FF0000' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects missing color', () => {
        const input = { name: 'Bug' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects 3-digit hex color', () => {
        const input = { name: 'Bug', color: '#F00' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects hex color without hash', () => {
        const input = { name: 'Bug', color: 'FF0000' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects named color', () => {
        const input = { name: 'Bug', color: 'red' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects RGB format', () => {
        const input = { name: 'Bug', color: 'rgb(255,0,0)' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects invalid hex characters', () => {
        const input = { name: 'Bug', color: '#GGGGGG' };
        expect(() => createLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('provides descriptive error message for invalid color', () => {
        const input = { name: 'Bug', color: 'invalid' };
        try {
          createLabelSchema.parse(input);
        } catch (error) {
          if (error instanceof ZodError) {
            expect(error.errors[0].message).toContain('hex color');
          }
        }
      });
    });
  });

  describe('updateLabelSchema', () => {
    // Happy Path Tests
    describe('happy path', () => {
      it('accepts empty object', () => {
        const input = {};
        expect(() => updateLabelSchema.parse(input)).not.toThrow();
      });

      it('accepts name update only', () => {
        const input = { name: 'New Name' };
        expect(() => updateLabelSchema.parse(input)).not.toThrow();
      });

      it('accepts color update only', () => {
        const input = { color: '#00FF00' };
        expect(() => updateLabelSchema.parse(input)).not.toThrow();
      });

      it('accepts both name and color update', () => {
        const input = { name: 'Updated', color: '#0000FF' };
        expect(() => updateLabelSchema.parse(input)).not.toThrow();
      });
    });

    // Unhappy Path Tests
    describe('unhappy path', () => {
      it('rejects empty name when provided', () => {
        const input = { name: '' };
        expect(() => updateLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects name exceeding max length', () => {
        const input = { name: 'L'.repeat(51) };
        expect(() => updateLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects invalid color format', () => {
        const input = { color: 'blue' };
        expect(() => updateLabelSchema.parse(input)).toThrow(ZodError);
      });

      it('rejects 3-digit hex color', () => {
        const input = { color: '#F00' };
        expect(() => updateLabelSchema.parse(input)).toThrow(ZodError);
      });
    });
  });
});

// ============================================================================
// Edge Cases and Security Tests
// ============================================================================

describe('Security and Edge Cases', () => {
  describe('XSS prevention', () => {
    it('accepts but does not sanitize script tags in board name', () => {
      // Note: Zod validates structure, not content. XSS prevention should happen at output
      const input = { name: '<script>alert("xss")</script>' };
      const result = createBoardSchema.parse(input);
      expect(result.name).toBe('<script>alert("xss")</script>');
    });

    it('accepts HTML in description', () => {
      const input = {
        title: 'Test',
        columnId: 'col-1',
        description: '<img src="x" onerror="alert(1)">',
      };
      expect(() => createTodoSchema.parse(input)).not.toThrow();
    });
  });

  describe('boundary values', () => {
    it('handles board name exactly at boundary', () => {
      expect(() => createBoardSchema.parse({ name: 'A'.repeat(100) })).not.toThrow();
      expect(() => createBoardSchema.parse({ name: 'A'.repeat(101) })).toThrow();
    });

    it('handles todo title exactly at boundary', () => {
      expect(() =>
        createTodoSchema.parse({ title: 'T'.repeat(200), columnId: 'col-1' })
      ).not.toThrow();
      expect(() =>
        createTodoSchema.parse({ title: 'T'.repeat(201), columnId: 'col-1' })
      ).toThrow();
    });

    it('handles label name exactly at boundary', () => {
      expect(() =>
        createLabelSchema.parse({ name: 'L'.repeat(50), color: '#FF0000' })
      ).not.toThrow();
      expect(() =>
        createLabelSchema.parse({ name: 'L'.repeat(51), color: '#FF0000' })
      ).toThrow();
    });

    it('handles position value of MAX_SAFE_INTEGER', () => {
      const input = {
        boardId: 'board-1',
        columns: [{ id: 'col-1', position: Number.MAX_SAFE_INTEGER }],
      };
      expect(() => reorderColumnsSchema.parse(input)).not.toThrow();
    });
  });

  describe('unicode handling', () => {
    it('handles emoji in board name', () => {
      const input = { name: '🎯 Sprint Goals 🚀' };
      expect(() => createBoardSchema.parse(input)).not.toThrow();
    });

    it('handles CJK characters', () => {
      const input = { title: '日本語タスク 中文任务', columnId: 'col-1' };
      expect(() => createTodoSchema.parse(input)).not.toThrow();
    });

    it('handles RTL characters', () => {
      const input = { name: 'مهمة عربية' };
      expect(() => createBoardSchema.parse(input)).not.toThrow();
    });

    it('handles combining characters', () => {
      const input = { name: 'Tes\u0301t' }; // é using combining acute accent
      expect(() => createBoardSchema.parse(input)).not.toThrow();
    });
  });

  describe('null vs undefined handling', () => {
    it('differentiates null and undefined in optional fields', () => {
      // undefined means "don't update this field"
      const withUndefined = updateBoardSchema.parse({ name: 'Test' });
      expect(withUndefined.description).toBeUndefined();

      // null means "set this field to null"
      const withNull = updateBoardSchema.parse({ name: 'Test', description: null });
      expect(withNull.description).toBeNull();
    });
  });

  describe('type coercion', () => {
    it('does not coerce string numbers to numbers', () => {
      const input = { columnId: 'col-1', position: '5' };
      expect(() => moveTodoSchema.parse(input)).toThrow(ZodError);
    });

    it('does not coerce boolean strings', () => {
      const input = { archived: 'true' };
      expect(() => archiveTodoSchema.parse(input)).toThrow(ZodError);
    });
  });
});
