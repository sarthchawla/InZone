# Unit Testing PRD - InZone

## Overview

This document defines the unit testing requirements for the InZone application. Unit tests ensure individual components, functions, hooks, and services work correctly in isolation, covering both success and failure scenarios.

---

## 1. Testing Framework & Tools

### Frontend
| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner, fast, Vite-native |
| **React Testing Library** | Component testing, user-centric |
| **@testing-library/user-event** | User interaction simulation |
| **MSW (Mock Service Worker)** | API mocking |
| **@testing-library/jest-dom** | DOM matchers |

### Backend
| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (unified across stack) |
| **Supertest** | HTTP request testing |
| **Prisma Mock** | Database mocking |
| **Sinon** | Spies, stubs, mocks |

---

## 2. Project Structure

```
inzone/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── board/
│   │   │   │   │   ├── BoardCard.tsx
│   │   │   │   │   ├── BoardCard.test.tsx
│   │   │   │   │   ├── BoardList.tsx
│   │   │   │   │   ├── BoardList.test.tsx
│   │   │   │   │   ├── BoardView.tsx
│   │   │   │   │   └── BoardView.test.tsx
│   │   │   │   ├── column/
│   │   │   │   │   ├── Column.tsx
│   │   │   │   │   ├── Column.test.tsx
│   │   │   │   │   ├── ColumnHeader.tsx
│   │   │   │   │   └── ColumnHeader.test.tsx
│   │   │   │   ├── todo/
│   │   │   │   │   ├── TodoCard.tsx
│   │   │   │   │   ├── TodoCard.test.tsx
│   │   │   │   │   ├── TodoModal.tsx
│   │   │   │   │   └── TodoModal.test.tsx
│   │   │   │   └── ui/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Button.test.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       └── Input.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useBoards.ts
│   │   │   │   ├── useBoards.test.ts
│   │   │   │   ├── useTodos.ts
│   │   │   │   ├── useTodos.test.ts
│   │   │   │   ├── useDragAndDrop.ts
│   │   │   │   └── useDragAndDrop.test.ts
│   │   │   ├── stores/
│   │   │   │   ├── boardStore.ts
│   │   │   │   ├── boardStore.test.ts
│   │   │   │   └── ...
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   ├── client.test.ts
│   │   │   │   └── ...
│   │   │   └── utils/
│   │   │       ├── formatters.ts
│   │   │       ├── formatters.test.ts
│   │   │       └── ...
│   │   ├── vitest.config.ts
│   │   └── vitest.setup.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── boards.ts
│       │   │   ├── boards.test.ts
│       │   │   ├── columns.ts
│       │   │   ├── columns.test.ts
│       │   │   ├── todos.ts
│       │   │   ├── todos.test.ts
│       │   │   ├── labels.ts
│       │   │   └── labels.test.ts
│       │   ├── services/
│       │   │   ├── boardService.ts
│       │   │   ├── boardService.test.ts
│       │   │   ├── todoService.ts
│       │   │   ├── todoService.test.ts
│       │   │   └── ...
│       │   ├── middleware/
│       │   │   ├── errorHandler.ts
│       │   │   ├── errorHandler.test.ts
│       │   │   ├── validation.ts
│       │   │   └── validation.test.ts
│       │   └── utils/
│       │       ├── validators.ts
│       │       ├── validators.test.ts
│       │       └── ...
│       ├── vitest.config.ts
│       └── vitest.setup.ts
```

---

## 3. Frontend Unit Tests

### 3.1 Component Tests

#### BoardCard Component

```typescript
// apps/web/src/components/board/BoardCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardCard } from './BoardCard';

describe('BoardCard', () => {
  const defaultProps = {
    id: 'board-1',
    name: 'Test Board',
    description: 'A test board',
    todoCount: 5,
    onClick: vi.fn(),
    onDelete: vi.fn(),
  };

  // Happy Path Tests
  describe('rendering', () => {
    it('renders board name', () => {
      render(<BoardCard {...defaultProps} />);
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    it('renders board description', () => {
      render(<BoardCard {...defaultProps} />);
      expect(screen.getByText('A test board')).toBeInTheDocument();
    });

    it('renders todo count', () => {
      render(<BoardCard {...defaultProps} />);
      expect(screen.getByText('5 tasks')).toBeInTheDocument();
    });

    it('renders singular "task" when count is 1', () => {
      render(<BoardCard {...defaultProps} todoCount={1} />);
      expect(screen.getByText('1 task')).toBeInTheDocument();
    });

    it('handles missing description gracefully', () => {
      render(<BoardCard {...defaultProps} description={undefined} />);
      expect(screen.queryByTestId('board-description')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      render(<BoardCard {...defaultProps} />);

      await user.click(screen.getByRole('article'));
      expect(defaultProps.onClick).toHaveBeenCalledWith('board-1');
    });

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<BoardCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(defaultProps.onDelete).toHaveBeenCalledWith('board-1');
    });

    it('does not trigger onClick when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<BoardCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  // Unhappy Path Tests
  describe('error handling', () => {
    it('handles very long board name', () => {
      const longName = 'A'.repeat(300);
      render(<BoardCard {...defaultProps} name={longName} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles special characters in name', () => {
      render(<BoardCard {...defaultProps} name="<script>alert('xss')</script>" />);
      expect(screen.queryByRole('script')).not.toBeInTheDocument();
    });

    it('handles zero todo count', () => {
      render(<BoardCard {...defaultProps} todoCount={0} />);
      expect(screen.getByText('0 tasks')).toBeInTheDocument();
    });

    it('handles negative todo count gracefully', () => {
      render(<BoardCard {...defaultProps} todoCount={-1} />);
      expect(screen.getByText('0 tasks')).toBeInTheDocument();
    });
  });
});
```

#### TodoCard Component

```typescript
// apps/web/src/components/todo/TodoCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoCard } from './TodoCard';

describe('TodoCard', () => {
  const defaultProps = {
    id: 'todo-1',
    title: 'Test Todo',
    description: 'A test todo',
    priority: 'MEDIUM' as const,
    dueDate: null,
    labels: [],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  // Happy Path Tests
  describe('rendering', () => {
    it('renders todo title', () => {
      render(<TodoCard {...defaultProps} />);
      expect(screen.getByText('Test Todo')).toBeInTheDocument();
    });

    it('renders priority badge', () => {
      render(<TodoCard {...defaultProps} priority="HIGH" />);
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('renders due date when provided', () => {
      const dueDate = new Date('2025-02-01');
      render(<TodoCard {...defaultProps} dueDate={dueDate} />);
      expect(screen.getByText(/Feb 1/)).toBeInTheDocument();
    });

    it('renders labels', () => {
      const labels = [
        { id: '1', name: 'Bug', color: '#FF0000' },
        { id: '2', name: 'Urgent', color: '#FFA500' },
      ];
      render(<TodoCard {...defaultProps} labels={labels} />);
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('does not render due date section when null', () => {
      render(<TodoCard {...defaultProps} dueDate={null} />);
      expect(screen.queryByTestId('due-date')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onEdit when card is double-clicked', async () => {
      const user = userEvent.setup();
      render(<TodoCard {...defaultProps} />);

      await user.dblClick(screen.getByRole('article'));
      expect(defaultProps.onEdit).toHaveBeenCalledWith('todo-1');
    });

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<TodoCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(defaultProps.onDelete).toHaveBeenCalledWith('todo-1');
    });
  });

  // Unhappy Path Tests
  describe('edge cases', () => {
    it('handles empty title gracefully', () => {
      render(<TodoCard {...defaultProps} title="" />);
      expect(screen.getByTestId('todo-card')).toBeInTheDocument();
    });

    it('handles past due date with visual indicator', () => {
      const pastDate = new Date('2020-01-01');
      render(<TodoCard {...defaultProps} dueDate={pastDate} />);
      expect(screen.getByTestId('due-date')).toHaveClass('overdue');
    });

    it('handles invalid priority gracefully', () => {
      // @ts-expect-error testing invalid prop
      render(<TodoCard {...defaultProps} priority="INVALID" />);
      expect(screen.getByTestId('todo-card')).toBeInTheDocument();
    });

    it('handles very long description', () => {
      const longDesc = 'A'.repeat(1000);
      render(<TodoCard {...defaultProps} description={longDesc} />);
      expect(screen.getByTestId('todo-card')).toBeInTheDocument();
    });

    it('handles XSS in title', () => {
      render(<TodoCard {...defaultProps} title="<script>alert('xss')</script>" />);
      expect(screen.queryByRole('script')).not.toBeInTheDocument();
    });
  });
});
```

#### Column Component

```typescript
// apps/web/src/components/column/Column.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Column } from './Column';
import { DndContext } from '@dnd-kit/core';

const renderWithDnd = (component: React.ReactNode) => {
  return render(<DndContext>{component}</DndContext>);
};

describe('Column', () => {
  const defaultProps = {
    id: 'col-1',
    name: 'Todo',
    todos: [],
    wipLimit: null,
    onAddTodo: vi.fn(),
    onEditColumn: vi.fn(),
    onDeleteColumn: vi.fn(),
  };

  // Happy Path Tests
  describe('rendering', () => {
    it('renders column name', () => {
      renderWithDnd(<Column {...defaultProps} />);
      expect(screen.getByText('Todo')).toBeInTheDocument();
    });

    it('renders todo count', () => {
      const todos = [
        { id: '1', title: 'Todo 1' },
        { id: '2', title: 'Todo 2' },
      ];
      renderWithDnd(<Column {...defaultProps} todos={todos} />);
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('renders WIP limit indicator', () => {
      renderWithDnd(<Column {...defaultProps} wipLimit={5} />);
      expect(screen.getByText('0/5')).toBeInTheDocument();
    });

    it('renders add card button', () => {
      renderWithDnd(<Column {...defaultProps} />);
      expect(screen.getByRole('button', { name: /add card/i })).toBeInTheDocument();
    });

    it('renders empty state when no todos', () => {
      renderWithDnd(<Column {...defaultProps} />);
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onAddTodo when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithDnd(<Column {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add card/i }));
      expect(defaultProps.onAddTodo).toHaveBeenCalledWith('col-1');
    });

    it('calls onEditColumn when header is clicked', async () => {
      const user = userEvent.setup();
      renderWithDnd(<Column {...defaultProps} />);

      await user.click(screen.getByText('Todo'));
      expect(defaultProps.onEditColumn).toHaveBeenCalledWith('col-1');
    });
  });

  // Unhappy Path Tests
  describe('WIP limit handling', () => {
    it('shows warning when at WIP limit', () => {
      const todos = [
        { id: '1', title: 'Todo 1' },
        { id: '2', title: 'Todo 2' },
        { id: '3', title: 'Todo 3' },
      ];
      renderWithDnd(<Column {...defaultProps} todos={todos} wipLimit={3} />);
      expect(screen.getByTestId('wip-warning')).toBeInTheDocument();
    });

    it('shows over-limit state when exceeding WIP', () => {
      const todos = [
        { id: '1', title: 'Todo 1' },
        { id: '2', title: 'Todo 2' },
        { id: '3', title: 'Todo 3' },
        { id: '4', title: 'Todo 4' },
      ];
      renderWithDnd(<Column {...defaultProps} todos={todos} wipLimit={3} />);
      expect(screen.getByTestId('wip-indicator')).toHaveClass('over-limit');
    });

    it('handles zero WIP limit', () => {
      renderWithDnd(<Column {...defaultProps} wipLimit={0} />);
      expect(screen.queryByTestId('wip-indicator')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles empty column name', () => {
      renderWithDnd(<Column {...defaultProps} name="" />);
      expect(screen.getByTestId('column')).toBeInTheDocument();
    });

    it('handles null todos array', () => {
      // @ts-expect-error testing null todos
      renderWithDnd(<Column {...defaultProps} todos={null} />);
      expect(screen.getByTestId('column')).toBeInTheDocument();
    });
  });
});
```

### 3.2 Hook Tests

#### useBoards Hook

```typescript
// apps/web/src/hooks/useBoards.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBoards, useCreateBoard, useDeleteBoard } from './useBoards';
import { server } from '../test/mocks/server';
import { rest } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBoards', () => {
  // Happy Path Tests
  describe('fetching boards', () => {
    it('fetches boards successfully', async () => {
      const { result } = renderHook(() => useBoards(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });

    it('returns loading state initially', () => {
      const { result } = renderHook(() => useBoards(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  // Unhappy Path Tests
  describe('error handling', () => {
    it('handles network error', async () => {
      server.use(
        rest.get('/api/boards', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      const { result } = renderHook(() => useBoards(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('handles timeout', async () => {
      server.use(
        rest.get('/api/boards', (req, res, ctx) => {
          return res(ctx.delay('infinite'));
        })
      );

      const { result } = renderHook(() => useBoards(), {
        wrapper: createWrapper(),
      });

      // Should stay in loading state
      expect(result.current.isLoading).toBe(true);
    });
  });
});

describe('useCreateBoard', () => {
  // Happy Path Tests
  it('creates board successfully', async () => {
    const { result } = renderHook(() => useCreateBoard(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: 'New Board' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Unhappy Path Tests
  it('handles validation error', async () => {
    server.use(
      rest.post('/api/boards', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({ error: 'Name is required' }));
      })
    );

    const { result } = renderHook(() => useCreateBoard(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: '' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toContain('Name is required');
  });
});

describe('useDeleteBoard', () => {
  // Happy Path Tests
  it('deletes board successfully', async () => {
    const { result } = renderHook(() => useDeleteBoard(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('board-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Unhappy Path Tests
  it('handles deletion of non-existent board', async () => {
    server.use(
      rest.delete('/api/boards/:id', (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ error: 'Board not found' }));
      })
    );

    const { result } = renderHook(() => useDeleteBoard(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('non-existent');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### 3.3 Store Tests (Zustand)

```typescript
// apps/web/src/stores/boardStore.test.ts
import { act, renderHook } from '@testing-library/react';
import { useBoardStore } from './boardStore';

describe('boardStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useBoardStore.getState().reset();
  });

  // Happy Path Tests
  describe('board operations', () => {
    it('adds board to store', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.addBoard({ id: '1', name: 'Test Board', columns: [] });
      });

      expect(result.current.boards).toHaveLength(1);
      expect(result.current.boards[0].name).toBe('Test Board');
    });

    it('removes board from store', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.addBoard({ id: '1', name: 'Test Board', columns: [] });
        result.current.removeBoard('1');
      });

      expect(result.current.boards).toHaveLength(0);
    });

    it('updates board in store', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.addBoard({ id: '1', name: 'Old Name', columns: [] });
        result.current.updateBoard('1', { name: 'New Name' });
      });

      expect(result.current.boards[0].name).toBe('New Name');
    });

    it('sets selected board', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.setSelectedBoard('board-1');
      });

      expect(result.current.selectedBoardId).toBe('board-1');
    });
  });

  // Unhappy Path Tests
  describe('error handling', () => {
    it('handles removing non-existent board', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.removeBoard('non-existent');
      });

      expect(result.current.boards).toHaveLength(0);
    });

    it('handles updating non-existent board', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.updateBoard('non-existent', { name: 'New Name' });
      });

      expect(result.current.boards).toHaveLength(0);
    });

    it('handles adding board with duplicate id', () => {
      const { result } = renderHook(() => useBoardStore());

      act(() => {
        result.current.addBoard({ id: '1', name: 'First', columns: [] });
        result.current.addBoard({ id: '1', name: 'Second', columns: [] });
      });

      // Should update existing board
      expect(result.current.boards).toHaveLength(1);
      expect(result.current.boards[0].name).toBe('Second');
    });
  });
});
```

### 3.4 Utility Function Tests

```typescript
// apps/web/src/utils/formatters.test.ts
import { formatDate, formatDueDate, truncateText, formatPriority } from './formatters';

describe('formatters', () => {
  // Happy Path Tests
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2025-02-15');
      expect(formatDate(date)).toBe('Feb 15, 2025');
    });

    it('formats date with custom format', () => {
      const date = new Date('2025-02-15');
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-02-15');
    });
  });

  describe('formatDueDate', () => {
    it('returns "Today" for current date', () => {
      const today = new Date();
      expect(formatDueDate(today)).toBe('Today');
    });

    it('returns "Tomorrow" for next day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatDueDate(tomorrow)).toBe('Tomorrow');
    });

    it('returns "Overdue" for past date', () => {
      const past = new Date('2020-01-01');
      expect(formatDueDate(past)).toContain('Overdue');
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      const text = 'This is a very long text that should be truncated';
      expect(truncateText(text, 20)).toBe('This is a very long...');
    });

    it('does not truncate short text', () => {
      const text = 'Short';
      expect(truncateText(text, 20)).toBe('Short');
    });
  });

  describe('formatPriority', () => {
    it('formats priority correctly', () => {
      expect(formatPriority('HIGH')).toBe('High');
      expect(formatPriority('LOW')).toBe('Low');
    });
  });

  // Unhappy Path Tests
  describe('edge cases', () => {
    it('handles null date', () => {
      expect(formatDate(null)).toBe('');
    });

    it('handles invalid date', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid date');
    });

    it('handles empty text in truncate', () => {
      expect(truncateText('', 20)).toBe('');
    });

    it('handles null text in truncate', () => {
      expect(truncateText(null, 20)).toBe('');
    });

    it('handles negative max length', () => {
      expect(truncateText('Test', -5)).toBe('Test');
    });

    it('handles unknown priority', () => {
      // @ts-expect-error testing invalid priority
      expect(formatPriority('UNKNOWN')).toBe('Unknown');
    });
  });
});
```

---

## 4. Backend Unit Tests

### 4.1 Service Tests

#### Board Service

```typescript
// apps/api/src/services/boardService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardService } from './boardService';
import { prismaMock } from '../test/prismaMock';

describe('BoardService', () => {
  let boardService: BoardService;

  beforeEach(() => {
    boardService = new BoardService(prismaMock);
  });

  // Happy Path Tests
  describe('getBoards', () => {
    it('returns all boards', async () => {
      const mockBoards = [
        { id: '1', name: 'Board 1', columns: [] },
        { id: '2', name: 'Board 2', columns: [] },
      ];
      prismaMock.board.findMany.mockResolvedValue(mockBoards);

      const result = await boardService.getBoards();

      expect(result).toEqual(mockBoards);
      expect(prismaMock.board.findMany).toHaveBeenCalled();
    });

    it('returns empty array when no boards exist', async () => {
      prismaMock.board.findMany.mockResolvedValue([]);

      const result = await boardService.getBoards();

      expect(result).toEqual([]);
    });
  });

  describe('createBoard', () => {
    it('creates board successfully', async () => {
      const input = { name: 'New Board', description: 'Test' };
      const mockBoard = { id: '1', ...input, columns: [] };
      prismaMock.board.create.mockResolvedValue(mockBoard);

      const result = await boardService.createBoard(input);

      expect(result).toEqual(mockBoard);
      expect(prismaMock.board.create).toHaveBeenCalledWith({
        data: input,
        include: { columns: true },
      });
    });

    it('creates board from template', async () => {
      const template = {
        id: 'kanban-basic',
        columns: [{ name: 'Todo' }, { name: 'In Progress' }, { name: 'Done' }],
      };
      prismaMock.boardTemplate.findUnique.mockResolvedValue(template);
      prismaMock.board.create.mockResolvedValue({
        id: '1',
        name: 'Sprint Board',
        columns: template.columns.map((c, i) => ({ ...c, id: `col-${i}` })),
      });

      const result = await boardService.createBoard({
        name: 'Sprint Board',
        templateId: 'kanban-basic',
      });

      expect(result.columns).toHaveLength(3);
    });
  });

  describe('deleteBoard', () => {
    it('deletes board successfully', async () => {
      prismaMock.board.delete.mockResolvedValue({ id: '1' });

      await boardService.deleteBoard('1');

      expect(prismaMock.board.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  // Unhappy Path Tests
  describe('error handling', () => {
    it('throws error when creating board with invalid data', async () => {
      prismaMock.board.create.mockRejectedValue(new Error('Validation error'));

      await expect(
        boardService.createBoard({ name: '' })
      ).rejects.toThrow('Validation error');
    });

    it('throws error when board not found for update', async () => {
      prismaMock.board.update.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(
        boardService.updateBoard('non-existent', { name: 'Test' })
      ).rejects.toThrow('Record not found');
    });

    it('throws error when template not found', async () => {
      prismaMock.boardTemplate.findUnique.mockResolvedValue(null);

      await expect(
        boardService.createBoard({ name: 'Test', templateId: 'invalid' })
      ).rejects.toThrow('Template not found');
    });

    it('handles database connection error', async () => {
      prismaMock.board.findMany.mockRejectedValue(
        new Error('Connection refused')
      );

      await expect(boardService.getBoards()).rejects.toThrow('Connection refused');
    });
  });
});
```

#### Todo Service

```typescript
// apps/api/src/services/todoService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TodoService } from './todoService';
import { prismaMock } from '../test/prismaMock';

describe('TodoService', () => {
  let todoService: TodoService;

  beforeEach(() => {
    todoService = new TodoService(prismaMock);
  });

  // Happy Path Tests
  describe('createTodo', () => {
    it('creates todo with required fields', async () => {
      const input = { title: 'Test Todo', columnId: 'col-1' };
      const mockTodo = { id: '1', ...input, priority: 'MEDIUM' };
      prismaMock.todo.create.mockResolvedValue(mockTodo);

      const result = await todoService.createTodo(input);

      expect(result.title).toBe('Test Todo');
      expect(result.priority).toBe('MEDIUM');
    });

    it('creates todo with all fields', async () => {
      const input = {
        title: 'Full Todo',
        description: 'Description',
        priority: 'HIGH',
        dueDate: new Date('2025-02-01'),
        columnId: 'col-1',
        labelIds: ['label-1', 'label-2'],
      };
      const mockTodo = { id: '1', ...input, labels: [] };
      prismaMock.todo.create.mockResolvedValue(mockTodo);

      const result = await todoService.createTodo(input);

      expect(result.priority).toBe('HIGH');
    });

    it('assigns correct position in column', async () => {
      prismaMock.todo.count.mockResolvedValue(5);
      prismaMock.todo.create.mockResolvedValue({
        id: '1',
        title: 'Test',
        position: 5,
      });

      const result = await todoService.createTodo({
        title: 'Test',
        columnId: 'col-1',
      });

      expect(result.position).toBe(5);
    });
  });

  describe('moveTodo', () => {
    it('moves todo to new column', async () => {
      prismaMock.todo.update.mockResolvedValue({
        id: '1',
        columnId: 'col-2',
      });

      const result = await todoService.moveTodo('1', 'col-2');

      expect(result.columnId).toBe('col-2');
    });

    it('updates positions after move', async () => {
      prismaMock.todo.update.mockResolvedValue({ id: '1' });
      prismaMock.todo.updateMany.mockResolvedValue({ count: 3 });

      await todoService.moveTodo('1', 'col-2', 0);

      expect(prismaMock.todo.updateMany).toHaveBeenCalled();
    });
  });

  describe('archiveTodo', () => {
    it('archives todo', async () => {
      prismaMock.todo.update.mockResolvedValue({
        id: '1',
        archived: true,
      });

      const result = await todoService.archiveTodo('1');

      expect(result.archived).toBe(true);
    });
  });

  // Unhappy Path Tests
  describe('error handling', () => {
    it('throws error when column does not exist', async () => {
      prismaMock.column.findUnique.mockResolvedValue(null);

      await expect(
        todoService.createTodo({ title: 'Test', columnId: 'invalid' })
      ).rejects.toThrow('Column not found');
    });

    it('throws error when todo not found for update', async () => {
      prismaMock.todo.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        todoService.updateTodo('invalid', { title: 'Test' })
      ).rejects.toThrow('Record not found');
    });

    it('throws error when moving to non-existent column', async () => {
      prismaMock.column.findUnique.mockResolvedValue(null);

      await expect(
        todoService.moveTodo('1', 'invalid-column')
      ).rejects.toThrow('Column not found');
    });

    it('handles concurrent modification', async () => {
      prismaMock.todo.update.mockRejectedValue(
        new Error('Concurrent modification')
      );

      await expect(
        todoService.updateTodo('1', { title: 'Test' })
      ).rejects.toThrow('Concurrent modification');
    });

    it('validates priority enum', async () => {
      await expect(
        todoService.createTodo({
          title: 'Test',
          columnId: 'col-1',
          // @ts-expect-error testing invalid priority
          priority: 'INVALID',
        })
      ).rejects.toThrow('Invalid priority');
    });
  });
});
```

### 4.2 Route Tests

```typescript
// apps/api/src/routes/boards.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prismaMock, resetPrismaMock } from '../test/prismaMock';

describe('Boards API', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  // Happy Path Tests
  describe('GET /api/boards', () => {
    it('returns 200 with boards list', async () => {
      prismaMock.board.findMany.mockResolvedValue([
        { id: '1', name: 'Board 1' },
        { id: '2', name: 'Board 2' },
      ]);

      const response = await request(app).get('/api/boards');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('returns 200 with empty array when no boards', async () => {
      prismaMock.board.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/boards');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/boards', () => {
    it('returns 201 when board created', async () => {
      prismaMock.board.create.mockResolvedValue({
        id: '1',
        name: 'New Board',
      });

      const response = await request(app)
        .post('/api/boards')
        .send({ name: 'New Board' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Board');
    });
  });

  describe('GET /api/boards/:id', () => {
    it('returns 200 with board details', async () => {
      prismaMock.board.findUnique.mockResolvedValue({
        id: '1',
        name: 'Board 1',
        columns: [],
      });

      const response = await request(app).get('/api/boards/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });
  });

  describe('DELETE /api/boards/:id', () => {
    it('returns 204 when board deleted', async () => {
      prismaMock.board.delete.mockResolvedValue({ id: '1' });

      const response = await request(app).delete('/api/boards/1');

      expect(response.status).toBe(204);
    });
  });

  // Unhappy Path Tests
  describe('error handling', () => {
    it('returns 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/boards')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    it('returns 404 for non-existent board', async () => {
      prismaMock.board.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/boards/non-existent');

      expect(response.status).toBe(404);
    });

    it('returns 500 for database error', async () => {
      prismaMock.board.findMany.mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/api/boards');

      expect(response.status).toBe(500);
    });

    it('handles malformed JSON', async () => {
      const response = await request(app)
        .post('/api/boards')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('returns 404 for delete of non-existent board', async () => {
      prismaMock.board.delete.mockRejectedValue(
        new Error('Record not found')
      );

      const response = await request(app).delete('/api/boards/non-existent');

      expect(response.status).toBe(404);
    });
  });
});
```

### 4.3 Middleware Tests

```typescript
// apps/api/src/middleware/errorHandler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { errorHandler, NotFoundError, ValidationError } from './errorHandler';

describe('errorHandler', () => {
  const mockReq = {} as any;
  const mockNext = vi.fn();

  const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  });

  // Happy Path Tests
  describe('error responses', () => {
    it('handles NotFoundError with 404', () => {
      const res = createMockRes();
      const error = new NotFoundError('Board not found');

      errorHandler(error, mockReq, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Board not found',
      });
    });

    it('handles ValidationError with 400', () => {
      const res = createMockRes();
      const error = new ValidationError('Invalid input');

      errorHandler(error, mockReq, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles generic Error with 500', () => {
      const res = createMockRes();
      const error = new Error('Unexpected error');

      errorHandler(error, mockReq, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // Unhappy Path Tests
  describe('edge cases', () => {
    it('handles error without message', () => {
      const res = createMockRes();
      const error = new Error();

      errorHandler(error, mockReq, res as any, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });

    it('handles non-Error objects', () => {
      const res = createMockRes();
      const error = 'string error';

      errorHandler(error as any, mockReq, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('does not leak stack traces in production', () => {
      process.env.NODE_ENV = 'production';
      const res = createMockRes();
      const error = new Error('Error');
      error.stack = 'sensitive stack trace';

      errorHandler(error, mockReq, res as any, mockNext);

      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ stack: expect.anything() })
      );
      process.env.NODE_ENV = 'test';
    });
  });
});
```

### 4.4 Validator Tests

```typescript
// apps/api/src/utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateBoard,
  validateTodo,
  validateColumn,
  validateLabel,
} from './validators';

describe('validators', () => {
  // Happy Path Tests
  describe('validateBoard', () => {
    it('validates valid board input', () => {
      const input = { name: 'Test Board', description: 'A description' };
      expect(() => validateBoard(input)).not.toThrow();
    });

    it('validates board with only required fields', () => {
      const input = { name: 'Test Board' };
      expect(() => validateBoard(input)).not.toThrow();
    });
  });

  describe('validateTodo', () => {
    it('validates valid todo input', () => {
      const input = {
        title: 'Test Todo',
        columnId: 'col-1',
        priority: 'HIGH',
      };
      expect(() => validateTodo(input)).not.toThrow();
    });

    it('validates todo with all fields', () => {
      const input = {
        title: 'Test Todo',
        description: 'Description',
        columnId: 'col-1',
        priority: 'HIGH',
        dueDate: '2025-02-01',
        labelIds: ['label-1'],
      };
      expect(() => validateTodo(input)).not.toThrow();
    });
  });

  describe('validateColumn', () => {
    it('validates valid column input', () => {
      const input = { name: 'Todo', boardId: 'board-1' };
      expect(() => validateColumn(input)).not.toThrow();
    });

    it('validates column with WIP limit', () => {
      const input = { name: 'In Progress', boardId: 'board-1', wipLimit: 5 };
      expect(() => validateColumn(input)).not.toThrow();
    });
  });

  describe('validateLabel', () => {
    it('validates valid label input', () => {
      const input = { name: 'Bug', color: '#FF0000' };
      expect(() => validateLabel(input)).not.toThrow();
    });
  });

  // Unhappy Path Tests
  describe('validation errors', () => {
    it('rejects board without name', () => {
      expect(() => validateBoard({})).toThrow('name');
    });

    it('rejects board with empty name', () => {
      expect(() => validateBoard({ name: '' })).toThrow('name');
    });

    it('rejects board with very long name', () => {
      expect(() => validateBoard({ name: 'A'.repeat(300) })).toThrow('name');
    });

    it('rejects todo without title', () => {
      expect(() => validateTodo({ columnId: 'col-1' })).toThrow('title');
    });

    it('rejects todo without columnId', () => {
      expect(() => validateTodo({ title: 'Test' })).toThrow('columnId');
    });

    it('rejects todo with invalid priority', () => {
      expect(() =>
        validateTodo({ title: 'Test', columnId: 'col-1', priority: 'INVALID' })
      ).toThrow('priority');
    });

    it('rejects todo with invalid date format', () => {
      expect(() =>
        validateTodo({
          title: 'Test',
          columnId: 'col-1',
          dueDate: 'not-a-date',
        })
      ).toThrow('dueDate');
    });

    it('rejects column without boardId', () => {
      expect(() => validateColumn({ name: 'Test' })).toThrow('boardId');
    });

    it('rejects column with negative WIP limit', () => {
      expect(() =>
        validateColumn({ name: 'Test', boardId: 'board-1', wipLimit: -1 })
      ).toThrow('wipLimit');
    });

    it('rejects label without name', () => {
      expect(() => validateLabel({ color: '#FF0000' })).toThrow('name');
    });

    it('rejects label with invalid color format', () => {
      expect(() => validateLabel({ name: 'Bug', color: 'red' })).toThrow('color');
    });

    it('rejects label with invalid hex color', () => {
      expect(() => validateLabel({ name: 'Bug', color: '#GGG' })).toThrow('color');
    });
  });
});
```

---

## 5. Test Implementation Checklist

### Phase 2.1: Unit Test Setup
- [ ] Install Vitest, React Testing Library, MSW (frontend)
- [ ] Install Vitest, Supertest, Prisma Mock (backend)
- [ ] Configure Vitest for both frontend and backend
- [ ] Set up MSW handlers for API mocking
- [ ] Create Prisma mock helper
- [ ] Set up test utilities and custom matchers

### Phase 2.2: Frontend Unit Tests
- [ ] Component tests (BoardCard, TodoCard, Column, etc.)
- [ ] Hook tests (useBoards, useTodos, useDragAndDrop)
- [ ] Store tests (Zustand stores)
- [ ] Utility function tests
- [ ] API client tests

### Phase 2.3: Backend Unit Tests
- [ ] Service tests (BoardService, TodoService, etc.)
- [ ] Route tests (all API endpoints)
- [ ] Middleware tests (errorHandler, validation)
- [ ] Validator tests
- [ ] Utility function tests

### Phase 2.4: CI Integration
- [ ] Add unit test job to CI pipeline
- [ ] Configure test coverage reporting
- [ ] Add coverage thresholds (80% minimum)
- [ ] Configure test caching for faster builds
- [ ] Add test result artifacts

---

## 6. Package Scripts

```json
// apps/web/package.json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}

// apps/api/package.json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## 7. CI Pipeline Configuration

```yaml
# .github/workflows/unit-tests.yml
name: Unit Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - name: Run Frontend Unit Tests
        run: pnpm --filter web test:coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./apps/web/coverage/lcov.info
          flags: frontend
      - name: Check Coverage Threshold
        run: |
          COVERAGE=$(cat ./apps/web/coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  backend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - name: Run Backend Unit Tests
        run: pnpm --filter api test:coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./apps/api/coverage/lcov.info
          flags: backend
      - name: Check Coverage Threshold
        run: |
          COVERAGE=$(cat ./apps/api/coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
```

---

## 8. Coverage Requirements

| Area | Minimum Coverage |
|------|-----------------|
| Frontend Components | 80% |
| Frontend Hooks | 90% |
| Frontend Stores | 90% |
| Frontend Utils | 95% |
| Backend Services | 85% |
| Backend Routes | 80% |
| Backend Middleware | 90% |
| Backend Validators | 95% |

---

*Document Version: 1.0*
*Last Updated: 2025-01-25*
*Parent PRD: [InZone PRD](../inzone-prd.md)*
