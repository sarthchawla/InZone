// Shared types for InZone

export interface Board {
  id: string;
  name: string;
  description?: string;
  position: number;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  columns?: Column[];
}

export interface Column {
  id: string;
  name: string;
  position: number;
  wipLimit?: number;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
  todos?: Todo[];
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: Date;
  position: number;
  archived: boolean;
  columnId: string;
  createdAt: Date;
  updatedAt: Date;
  labels?: Label[];
  sourceType?: SourceType;
  sourceId?: string;
  sourceUrl?: string;
  sourceMeta?: Record<string, unknown>;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description?: string;
  columns: ColumnTemplate[];
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColumnTemplate {
  name: string;
  wipLimit?: number;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SourceType = 'JIRA' | 'SLACK' | 'TEAMS' | 'OUTLOOK' | 'MANUAL';

// API Request/Response types
export interface CreateBoardRequest {
  name: string;
  description?: string;
  templateId?: string;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
}

export interface CreateColumnRequest {
  name: string;
  wipLimit?: number;
}

export interface UpdateColumnRequest {
  name?: string;
  wipLimit?: number;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  columnId: string;
  labelIds?: string[];
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  labelIds?: string[];
}

export interface MoveTodoRequest {
  columnId: string;
  position: number;
}

export interface ReorderRequest {
  items: { id: string; position: number }[];
}

export interface CreateLabelRequest {
  name: string;
  color: string;
}

export interface UpdateLabelRequest {
  name?: string;
  color?: string;
}
