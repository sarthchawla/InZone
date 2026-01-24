export interface Board {
  id: string;
  name: string;
  description?: string;
  position: number;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  columns: Column[];
}

export interface Column {
  id: string;
  name: string;
  position: number;
  wipLimit?: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  todos: Todo[];
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  position: number;
  archived: boolean;
  columnId: string;
  createdAt: string;
  updatedAt: string;
  labels: Label[];
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
  columns: { name: string; wipLimit?: number }[];
  isBuiltIn: boolean;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
