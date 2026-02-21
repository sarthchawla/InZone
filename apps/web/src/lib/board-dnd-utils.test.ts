import { describe, it, expect } from 'vitest';
import { computeColumnReorder, computeTodoDrop } from './board-dnd-utils';
import type { Board, Column, Todo } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<Todo> & { id: string; position: number }): Todo {
  return {
    title: 'Todo',
    priority: 'MEDIUM',
    archived: false,
    columnId: '',
    createdAt: '',
    updatedAt: '',
    labels: [],
    ...overrides,
  };
}

function makeColumn(
  overrides: Partial<Column> & { id: string; position: number },
): Column {
  return {
    name: 'Column',
    boardId: 'board-1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeBoard(columns: Column[]): Board {
  return {
    id: 'board-1',
    name: 'Board',
    position: 0,
    userId: 'user-1',
    createdAt: '',
    updatedAt: '',
    columns,
  };
}

type FindTodo = (id: string) => { todo: Todo; column: Column } | null;

function buildFindTodo(board: Board): FindTodo {
  return (id: string) => {
    for (const col of board.columns) {
      const todo = (col.todos ?? []).find((t) => t.id === id);
      if (todo) return { todo, column: col };
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// computeColumnReorder
// ---------------------------------------------------------------------------

describe('computeColumnReorder', () => {
  const colA = makeColumn({ id: 'a', position: 0 });
  const colB = makeColumn({ id: 'b', position: 1 });
  const colC = makeColumn({ id: 'c', position: 2 });
  const board = makeBoard([colA, colB, colC]);
  const findTodo = buildFindTodo(board);

  it('reorders when overIdStr is column-prefixed', () => {
    const result = computeColumnReorder(board, 'board-1', 'column-a', 'column-c', findTodo);
    expect(result).toEqual({
      boardId: 'board-1',
      columnIds: ['b', 'c', 'a'],
    });
  });

  it('resolves target column via findTodo when overIdStr is not column-prefixed', () => {
    const todoInB = makeTodo({ id: 'todo-1', position: 0, columnId: 'b' });
    const colWithTodo = makeColumn({ id: 'b', position: 1, todos: [todoInB] });
    const boardWithTodo = makeBoard([colA, colWithTodo, colC]);
    const ft = buildFindTodo(boardWithTodo);

    const result = computeColumnReorder(boardWithTodo, 'board-1', 'column-a', 'todo-1', ft);
    expect(result).toEqual({
      boardId: 'board-1',
      columnIds: ['b', 'a', 'c'],
    });
  });

  it('returns null when targetColumnId cannot be determined (findTodo returns null)', () => {
    const result = computeColumnReorder(board, 'board-1', 'column-a', 'nonexistent', findTodo);
    expect(result).toBeNull();
  });

  it('returns null when active and target columns are the same', () => {
    const result = computeColumnReorder(board, 'board-1', 'column-a', 'column-a', findTodo);
    expect(result).toBeNull();
  });

  it('returns null when activeIndex is -1 (unknown active column)', () => {
    const result = computeColumnReorder(board, 'board-1', 'column-unknown', 'column-b', findTodo);
    expect(result).toBeNull();
  });

  it('returns null when overIndex is -1 (target column not in board)', () => {
    // findTodo can resolve to a column id that isn't actually in board.columns
    const foreignCol = makeColumn({ id: 'foreign', position: 0 });
    const foreignTodo = makeTodo({ id: 'ft', position: 0, columnId: 'foreign' });
    foreignCol.todos = [foreignTodo];
    const fakeFindTodo: FindTodo = (id) => {
      if (id === 'ft') return { todo: foreignTodo, column: foreignCol };
      return null;
    };
    const result = computeColumnReorder(board, 'board-1', 'column-a', 'ft', fakeFindTodo);
    expect(result).toBeNull();
  });

  it('sorts columns by position before reordering', () => {
    // Provide columns in unsorted order
    const unsortedBoard = makeBoard([
      makeColumn({ id: 'c', position: 2 }),
      makeColumn({ id: 'a', position: 0 }),
      makeColumn({ id: 'b', position: 1 }),
    ]);
    const result = computeColumnReorder(unsortedBoard, 'board-1', 'column-a', 'column-c', buildFindTodo(unsortedBoard));
    // sorted: a(0), b(1), c(2) → move a before c → b, c, a
    expect(result).toEqual({
      boardId: 'board-1',
      columnIds: ['b', 'c', 'a'],
    });
  });
});

// ---------------------------------------------------------------------------
// computeTodoDrop
// ---------------------------------------------------------------------------

describe('computeTodoDrop', () => {
  // Shared setup: two columns, each with two todos
  const todo1 = makeTodo({ id: 't1', position: 0, columnId: 'col1' });
  const todo2 = makeTodo({ id: 't2', position: 1, columnId: 'col1' });
  const todo3 = makeTodo({ id: 't3', position: 0, columnId: 'col2' });
  const todo4 = makeTodo({ id: 't4', position: 1, columnId: 'col2' });

  const col1 = makeColumn({ id: 'col1', position: 0, todos: [todo1, todo2] });
  const col2 = makeColumn({ id: 'col2', position: 1, todos: [todo3, todo4] });
  const board = makeBoard([col1, col2]);
  const findTodo = buildFindTodo(board);

  it('returns null when active todo is not found', () => {
    const result = computeTodoDrop(board, 'board-1', 'nonexistent', 'col2', findTodo);
    expect(result).toBeNull();
  });

  it('returns a move when dropping on a different column directly (by column id)', () => {
    const result = computeTodoDrop(board, 'board-1', 't1', 'col2', findTodo);
    expect(result).toEqual({
      type: 'move',
      id: 't1',
      boardId: 'board-1',
      columnId: 'col2',
      position: 2, // col2 has 2 todos, so length = 2
    });
  });

  it('returns a move when dropping on an empty column', () => {
    const emptyCol = makeColumn({ id: 'col-empty', position: 2, todos: [] });
    const boardWithEmpty = makeBoard([col1, col2, emptyCol]);
    const ft = buildFindTodo(boardWithEmpty);
    const result = computeTodoDrop(boardWithEmpty, 'board-1', 't1', 'col-empty', ft);
    expect(result).toEqual({
      type: 'move',
      id: 't1',
      boardId: 'board-1',
      columnId: 'col-empty',
      position: 0,
    });
  });

  it('returns a move when dropping on a column with undefined todos', () => {
    const noTodosCol = makeColumn({ id: 'col-none', position: 2 }); // no todos field
    const boardNoTodos = makeBoard([col1, col2, noTodosCol]);
    const ft = buildFindTodo(boardNoTodos);
    const result = computeTodoDrop(boardNoTodos, 'board-1', 't1', 'col-none', ft);
    expect(result).toEqual({
      type: 'move',
      id: 't1',
      boardId: 'board-1',
      columnId: 'col-none',
      position: 0,
    });
  });

  it('returns a move when dropping on a todo in a different column', () => {
    const result = computeTodoDrop(board, 'board-1', 't1', 't3', findTodo);
    expect(result).toEqual({
      type: 'move',
      id: 't1',
      boardId: 'board-1',
      columnId: 'col2',
      position: 0, // t3's position
    });
  });

  it('returns reorder when dropping on a todo in the same column', () => {
    const result = computeTodoDrop(board, 'board-1', 't1', 't2', findTodo);
    expect(result).toEqual({
      type: 'reorder',
      boardId: 'board-1',
      columnId: 'col1',
      todoIds: ['t2', 't1'], // t1 moved to t2's index
    });
  });

  it('returns null when same-column reorder with same index (drop on self)', () => {
    const result = computeTodoDrop(board, 'board-1', 't1', 't1', findTodo);
    expect(result).toBeNull();
  });

  it('returns null when target column cannot be found at all', () => {
    // overIdStr doesn't match a column id and findTodo returns null for it
    const result = computeTodoDrop(board, 'board-1', 't1', 'nonexistent', findTodo);
    expect(result).toBeNull();
  });

  it('returns null for same-column when overTodoResult is null (overIdStr matched column)', () => {
    // Edge case: overIdStr matches a column id AND that column equals the source column
    // This means the active todo is dropped onto its own column → same column path
    // but findTodo(overIdStr=col1) returns null → overTodoResult is null → returns null
    const result = computeTodoDrop(board, 'board-1', 't1', 'col1', findTodo);
    expect(result).toBeNull();
  });

  it('handles reorder correctly with unsorted todos', () => {
    // Provide todos in reverse position order in the array
    const tA = makeTodo({ id: 'tA', position: 2, columnId: 'cx' });
    const tB = makeTodo({ id: 'tB', position: 0, columnId: 'cx' });
    const tC = makeTodo({ id: 'tC', position: 1, columnId: 'cx' });
    const cx = makeColumn({ id: 'cx', position: 0, todos: [tA, tB, tC] });
    const b = makeBoard([cx]);
    const ft = buildFindTodo(b);

    // sorted by position: tB(0), tC(1), tA(2)
    // Move tB to tA's index → tC, tA, tB
    const result = computeTodoDrop(b, 'board-1', 'tB', 'tA', ft);
    expect(result).toEqual({
      type: 'reorder',
      boardId: 'board-1',
      columnId: 'cx',
      todoIds: ['tC', 'tA', 'tB'],
    });
  });

  it('returns null for same-column when oldIndex is -1', () => {
    // This is tricky: findTodo finds the active, but after sorting, it's not found by id.
    // Practically impossible with correct data, but we can simulate with a rigged findTodo.
    const riggedTodo = makeTodo({ id: 'ghost', position: 0, columnId: 'col1' });
    const overTodo = todo2;
    const riggedFindTodo: FindTodo = (id) => {
      if (id === 'ghost') return { todo: riggedTodo, column: col1 };
      if (id === 't2') return { todo: overTodo, column: col1 };
      return null;
    };
    // ghost is not in col1.todos, so oldIndex = -1, returns null
    const result = computeTodoDrop(board, 'board-1', 'ghost', 't2', riggedFindTodo);
    expect(result).toBeNull();
  });

  it('returns null for same-column when newIndex is -1', () => {
    // overIdStr matched via findTodo to same column but overIdStr not in column.todos
    const riggedOverTodo = makeTodo({ id: 'phantom', position: 5, columnId: 'col1' });
    const riggedFindTodo: FindTodo = (id) => {
      if (id === 't1') return { todo: todo1, column: col1 };
      if (id === 'phantom') return { todo: riggedOverTodo, column: col1 };
      return null;
    };
    // phantom isn't in col1.todos so newIndex = -1
    const result = computeTodoDrop(board, 'board-1', 't1', 'phantom', riggedFindTodo);
    expect(result).toBeNull();
  });
});
