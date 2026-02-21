import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { DetailPanel } from './DetailPanel';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import { createMockTodo, createMockColumn, mockLabels } from '../../test/mocks/handlers';
import type { Todo, Column } from '../../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, drag, dragConstraints, dragElastic, onDragEnd, ...htmlProps } = props;
      return <div {...htmlProps}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useMediaQuery to always return desktop
vi.mock('../../hooks/useMediaQuery', () => ({
  useIsMobile: () => false,
}));

const createTestTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  title: 'Test Todo',
  description: 'A test description',
  priority: 'MEDIUM',
  position: 0,
  archived: false,
  columnId: 'col-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  labels: [],
  ...overrides,
});

const createTestColumns = (): Column[] => [
  createMockColumn({ id: 'col-1', name: 'Todo', position: 0, boardId: 'board-1' }),
  createMockColumn({ id: 'col-2', name: 'In Progress', position: 1, boardId: 'board-1' }),
];

describe('DetailPanel', () => {
  const defaultProps = {
    boardId: 'board-1',
    columns: createTestColumns(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
    server.use(
      http.get('/api/labels', () => HttpResponse.json(mockLabels)),
      http.get('/api/boards/board-1', () =>
        HttpResponse.json({
          id: 'board-1',
          name: 'Test Board',
          columns: createTestColumns(),
        })
      )
    );
  });

  describe('due date saving', () => {
    it('sends due date in ISO 8601 datetime format to API', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('/api/todos/todo-1', async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            id: 'todo-1',
            ...capturedBody,
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} />);

      const dateInput = screen.getByDisplayValue('');
      fireEvent.change(dateInput, { target: { value: '2026-06-15' } });

      // Wait for debounced save (800ms debounce + buffer)
      await waitFor(
        () => {
          expect(capturedBody).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(capturedBody!.dueDate).toBe('2026-06-15T00:00:00.000Z');
    });

    it('sends null when due date is cleared', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('/api/todos/todo-1', async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            id: 'todo-1',
            ...capturedBody,
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const todo = createTestTodo({ dueDate: '2026-06-15T00:00:00.000Z' });
      render(<DetailPanel todo={todo} {...defaultProps} />);

      const dateInput = screen.getByDisplayValue('2026-06-15');
      fireEvent.change(dateInput, { target: { value: '' } });

      await waitFor(
        () => {
          expect(capturedBody).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(capturedBody!.dueDate).toBeNull();
    });

    it('displays existing due date in date input', () => {
      const todo = createTestTodo({ dueDate: '2026-03-15T00:00:00.000Z' });
      render(<DetailPanel todo={todo} {...defaultProps} />);

      const dateInput = screen.getByDisplayValue('2026-03-15');
      expect(dateInput).toBeInTheDocument();
    });

    it('displays empty date input when no due date set', () => {
      const todo = createTestTodo({ dueDate: undefined });
      render(<DetailPanel todo={todo} {...defaultProps} />);

      const dateInputs = screen.getAllByRole('textbox').length;
      // The date input with type="date" should have empty value
      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('');
    });

    it('does not send bare YYYY-MM-DD format to API', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('/api/todos/todo-1', async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            id: 'todo-1',
            ...capturedBody,
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} />);

      const dateInput = screen.getByDisplayValue('');
      fireEvent.change(dateInput, { target: { value: '2026-12-25' } });

      await waitFor(
        () => {
          expect(capturedBody).not.toBeNull();
        },
        { timeout: 3000 }
      );

      // Must NOT be bare date format - must include time component
      expect(capturedBody!.dueDate).not.toBe('2026-12-25');
      expect(capturedBody!.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('rendering', () => {
    it('returns null when todo is null', () => {
      render(<DetailPanel todo={null} {...defaultProps} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title input with todo title', () => {
      const todo = createTestTodo({ title: 'My Task' });
      render(<DetailPanel todo={todo} {...defaultProps} />);
      expect(screen.getByDisplayValue('My Task')).toBeInTheDocument();
    });

    it('renders close button', () => {
      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} />);
      expect(screen.getByLabelText('Close panel')).toBeInTheDocument();
    });

    it('renders priority buttons', () => {
      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} />);
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Med')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('renders delete task button', () => {
      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} />);
      expect(screen.getByText('Delete task')).toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Close panel'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      const todo = createTestTodo();
      render(<DetailPanel todo={todo} {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
