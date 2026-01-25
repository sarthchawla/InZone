/**
 * Domain-specific Zod validation schemas for InZone API
 *
 * These schemas are used to validate request data for various API endpoints.
 * They are also exported for unit testing purposes.
 */
import { z } from 'zod';
import { Priority } from '@prisma/client';

// ============================================================================
// Board Validators
// ============================================================================

/**
 * Schema for creating a new board
 */
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  templateId: z.string().optional(),
});

/**
 * Schema for updating an existing board
 */
export const updateBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
  position: z.number().int('Position must be an integer').min(0, 'Position must be non-negative').optional(),
});

// ============================================================================
// Column Validators
// ============================================================================

/**
 * Schema for creating a new column
 */
export const createColumnSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(100000, 'Description must be at most 100KB').optional(),
  wipLimit: z.number().int('WIP limit must be an integer').min(1, 'WIP limit must be at least 1').optional(),
});

/**
 * Schema for updating an existing column
 */
export const updateColumnSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  description: z.string().max(100000, 'Description must be at most 100KB').nullable().optional(),
  wipLimit: z.number().int('WIP limit must be an integer').min(1, 'WIP limit must be at least 1').nullable().optional(),
});

/**
 * Schema for reordering columns within a board
 */
export const reorderColumnsSchema = z.object({
  boardId: z.string().min(1, 'Board ID is required'),
  columns: z.array(
    z.object({
      id: z.string().min(1, 'Column ID is required'),
      position: z.number().int('Position must be an integer').min(0, 'Position must be non-negative'),
    })
  ).min(1, 'At least one column must be provided'),
});

// ============================================================================
// Todo Validators
// ============================================================================

/**
 * Schema for creating a new todo
 */
export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format. Expected ISO 8601 format.' }).optional().nullable(),
  columnId: z.string().min(1, 'Column ID is required'),
  labelIds: z.array(z.string().min(1, 'Label ID cannot be empty')).optional(),
});

/**
 * Schema for updating an existing todo
 */
export const updateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters').optional(),
  description: z.string().max(5000, 'Description must be at most 5000 characters').nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format. Expected ISO 8601 format.' }).nullable().optional(),
  labelIds: z.array(z.string().min(1, 'Label ID cannot be empty')).optional(),
});

/**
 * Schema for moving a todo to a different column
 */
export const moveTodoSchema = z.object({
  columnId: z.string().min(1, 'Column ID is required'),
  position: z.number().int('Position must be an integer').min(0, 'Position must be non-negative').optional(),
});

/**
 * Schema for reordering todos within a column
 */
export const reorderTodosSchema = z.object({
  columnId: z.string().min(1, 'Column ID is required'),
  todos: z.array(
    z.object({
      id: z.string().min(1, 'Todo ID is required'),
      position: z.number().int('Position must be an integer').min(0, 'Position must be non-negative'),
    })
  ).min(1, 'At least one todo must be provided'),
});

/**
 * Schema for archiving/unarchiving a todo
 */
export const archiveTodoSchema = z.object({
  archived: z.boolean({ required_error: 'Archived status is required' }),
});

// ============================================================================
// Label Validators
// ============================================================================

/**
 * Regex pattern for validating 6-digit hex color codes
 */
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Schema for creating a new label
 */
export const createLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  color: z.string().regex(HEX_COLOR_PATTERN, 'Invalid hex color format. Expected format: #RRGGBB'),
});

/**
 * Schema for updating an existing label
 */
export const updateLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters').optional(),
  color: z.string().regex(HEX_COLOR_PATTERN, 'Invalid hex color format. Expected format: #RRGGBB').optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type MoveTodoInput = z.infer<typeof moveTodoSchema>;
export type ReorderTodosInput = z.infer<typeof reorderTodosSchema>;
export type ArchiveTodoInput = z.infer<typeof archiveTodoSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
