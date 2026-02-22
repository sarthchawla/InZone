import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/toast', () => ({
  undoToast: vi.fn(),
}));

import { useBoardActions } from './useBoardActions';
import { undoToast } from '../lib/toast';
import type { Todo, Column, Priority } from '../types';

const mockUndoToast = vi.mocked(undoToast);

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  title: 'Test Todo',
  description: 'A test description',
  priority: 'MEDIUM' as Priority,
  dueDate: '2024-06-01',
  position: 0,
  archived: false,
  columnId: 'col-1',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  labels: [{ id: 'l1', name: 'Bug', color: '#f00' }],
  ...overrides,
});

const createMockColumn = (overrides: Partial<Column> = {}): Column => ({
  id: 'col-1',
  name: 'To Do',
  position: 0,
  boardId: 'board-1',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  ...overrides,
});

function createDefaultParams(overrides: Record<string, unknown> = {}) {
  return {
    boardId: 'board-1' as string | undefined,
    columns: [
      createMockColumn({ id: 'col-1', name: 'To Do' }),
      createMockColumn({ id: 'col-2', name: 'In Progress' }),
      createMockColumn({ id: 'col-3', name: 'Done' }),
    ] as Column[] | undefined,
    selectedTodo: null as Todo | null,
    setSelectedTodo: vi.fn(),
    setContextMenuPosition: vi.fn(),
    setContextMenuTodo: vi.fn(),
    deleteTodo: { mutate: vi.fn() },
    createTodo: { mutate: vi.fn() },
    updateTodo: { mutate: vi.fn() },
    moveTodo: { mutate: vi.fn() },
    ...overrides,
  };
}

describe('useBoardActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTodoDeleteWithUndo', () => {
    it('returns early when boardId is undefined', () => {
      const params = createDefaultParams({ boardId: undefined });
      const { handleTodoDeleteWithUndo } = useBoardActions(params);
      const todo = createMockTodo();

      handleTodoDeleteWithUndo(todo);

      expect(params.deleteTodo.mutate).not.toHaveBeenCalled();
      expect(mockUndoToast).not.toHaveBeenCalled();
      expect(params.setContextMenuPosition).not.toHaveBeenCalled();
    });

    it('closes detail panel when selected todo matches deleted todo', () => {
      const todo = createMockTodo({ id: 'todo-1' });
      const params = createDefaultParams({ selectedTodo: todo });
      const { handleTodoDeleteWithUndo } = useBoardActions(params);

      handleTodoDeleteWithUndo(todo);

      expect(params.setSelectedTodo).toHaveBeenCalledWith(null);
    });

    it('does not close detail panel when different todo is selected', () => {
      const selectedTodo = createMockTodo({ id: 'todo-other' });
      const deletedTodo = createMockTodo({ id: 'todo-1' });
      const params = createDefaultParams({ selectedTodo });
      const { handleTodoDeleteWithUndo } = useBoardActions(params);

      handleTodoDeleteWithUndo(deletedTodo);

      expect(params.setSelectedTodo).not.toHaveBeenCalled();
    });

    it('closes context menu', () => {
      const params = createDefaultParams();
      const { handleTodoDeleteWithUndo } = useBoardActions(params);

      handleTodoDeleteWithUndo(createMockTodo());

      expect(params.setContextMenuPosition).toHaveBeenCalledWith(null);
      expect(params.setContextMenuTodo).toHaveBeenCalledWith(null);
    });

    it('calls deleteTodo.mutate with correct args', () => {
      const params = createDefaultParams();
      const { handleTodoDeleteWithUndo } = useBoardActions(params);
      const todo = createMockTodo({ id: 'todo-42' });

      handleTodoDeleteWithUndo(todo);

      expect(params.deleteTodo.mutate).toHaveBeenCalledWith({
        id: 'todo-42',
        boardId: 'board-1',
      });
    });

    it('calls undoToast with correct message', () => {
      const params = createDefaultParams();
      const { handleTodoDeleteWithUndo } = useBoardActions(params);
      const todo = createMockTodo({ title: 'My Task' });

      handleTodoDeleteWithUndo(todo);

      expect(mockUndoToast).toHaveBeenCalledWith(
        '"My Task" deleted',
        expect.any(Function),
      );
    });

    it('undo callback calls createTodo.mutate with original todo data', () => {
      const params = createDefaultParams();
      const { handleTodoDeleteWithUndo } = useBoardActions(params);
      const todo = createMockTodo({
        id: 'todo-1',
        title: 'Undo Me',
        description: 'desc',
        priority: 'HIGH',
        dueDate: '2024-12-31',
        columnId: 'col-1',
        labels: [
          { id: 'l1', name: 'Bug', color: '#f00' },
          { id: 'l2', name: 'Feature', color: '#0f0' },
        ],
      });

      handleTodoDeleteWithUndo(todo);

      // Call the undo callback passed to undoToast
      const undoCallback = mockUndoToast.mock.calls[0][1];
      undoCallback();

      expect(params.createTodo.mutate).toHaveBeenCalledWith({
        columnId: 'col-1',
        boardId: 'board-1',
        title: 'Undo Me',
        description: 'desc',
        priority: 'HIGH',
        dueDate: '2024-12-31',
        labelIds: ['l1', 'l2'],
      });
    });
  });

  describe('getContextMenuItems', () => {
    it('returns correct menu structure', () => {
      const params = createDefaultParams();
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo();

      const items = getContextMenuItems(todo);

      expect(items[0].label).toBe('Edit');
      expect(items[1].label).toBe('---');
      expect(items[2].label).toBe('Priority');
      expect(items[2].submenu).toHaveLength(4);
      expect(items[3].label).toBe('Move to');
      expect(items[3].submenu).toHaveLength(2); // excludes current col-1
      expect(items[4].label).toBe('---');
      expect(items[5].label).toBe('Delete');
      expect(items[5].danger).toBe(true);
    });

    it('Edit item calls setSelectedTodo with the todo', () => {
      const params = createDefaultParams();
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo();

      const items = getContextMenuItems(todo);
      items[0].onClick!();

      expect(params.setSelectedTodo).toHaveBeenCalledWith(todo);
    });

    it('Priority submenu items call updateTodo.mutate with correct priority', () => {
      const params = createDefaultParams();
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo({ id: 'todo-p' });

      const items = getContextMenuItems(todo);
      const prioritySub = items[2].submenu!;

      expect(prioritySub[0].label).toBe('Low');
      expect(prioritySub[1].label).toBe('Medium');
      expect(prioritySub[2].label).toBe('High');
      expect(prioritySub[3].label).toBe('Urgent');

      prioritySub[2].onClick!();
      expect(params.updateTodo.mutate).toHaveBeenCalledWith({
        id: 'todo-p',
        boardId: 'board-1',
        priority: 'HIGH',
      });
    });

    it('Priority submenu item returns early when boardId is undefined', () => {
      const params = createDefaultParams({ boardId: undefined });
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo();

      const items = getContextMenuItems(todo);
      items[2].submenu![0].onClick!();

      expect(params.updateTodo.mutate).not.toHaveBeenCalled();
    });

    it('Move to submenu excludes current column', () => {
      const params = createDefaultParams();
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo({ columnId: 'col-2' });

      const items = getContextMenuItems(todo);
      const moveToItem = items.find((i) => i.label === 'Move to')!;
      const moveLabels = moveToItem.submenu!.map((s) => s.label);

      expect(moveLabels).toContain('To Do');
      expect(moveLabels).toContain('Done');
      expect(moveLabels).not.toContain('In Progress');
    });

    it('Move to submenu item calls moveTodo.mutate', () => {
      const params = createDefaultParams();
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo({ id: 'todo-m', columnId: 'col-1' });

      const items = getContextMenuItems(todo);
      const moveToItem = items.find((i) => i.label === 'Move to')!;
      // col-2 is "In Progress"
      const inProgressItem = moveToItem.submenu!.find((s) => s.label === 'In Progress')!;
      inProgressItem.onClick!();

      expect(params.moveTodo.mutate).toHaveBeenCalledWith({
        id: 'todo-m',
        boardId: 'board-1',
        columnId: 'col-2',
        position: 0,
      });
    });

    it('Move to submenu item returns early when boardId is undefined', () => {
      const params = createDefaultParams({ boardId: undefined });
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo({ columnId: 'col-1' });

      const items = getContextMenuItems(todo);
      const moveToItem = items.find((i) => i.label === 'Move to')!;
      moveToItem.submenu![0].onClick!();

      expect(params.moveTodo.mutate).not.toHaveBeenCalled();
    });

    it('omits Move to when only one column (the current one)', () => {
      const params = createDefaultParams({
        columns: [createMockColumn({ id: 'col-1', name: 'To Do' })],
      });
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo({ columnId: 'col-1' });

      const items = getContextMenuItems(todo);
      const moveToItem = items.find((i) => i.label === 'Move to');

      expect(moveToItem).toBeUndefined();
    });

    it('omits Move to when columns is undefined', () => {
      const params = createDefaultParams({ columns: undefined });
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo();

      const items = getContextMenuItems(todo);
      const moveToItem = items.find((i) => i.label === 'Move to');

      expect(moveToItem).toBeUndefined();
    });

    it('Delete item calls handleTodoDeleteWithUndo', () => {
      const params = createDefaultParams();
      const { getContextMenuItems } = useBoardActions(params);
      const todo = createMockTodo({ id: 'todo-del' });

      const items = getContextMenuItems(todo);
      const deleteItem = items.find((i) => i.label === 'Delete')!;
      deleteItem.onClick!();

      expect(params.deleteTodo.mutate).toHaveBeenCalledWith({
        id: 'todo-del',
        boardId: 'board-1',
      });
    });
  });
});
