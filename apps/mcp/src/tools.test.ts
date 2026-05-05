import { describe, expect, it, vi } from 'vitest';
import { InZoneMcpTools } from './tools.js';

function textFrom(result: Awaited<ReturnType<InZoneMcpTools['listBoards']>>): string {
  return result.content[0]?.type === 'text' ? result.content[0].text : '';
}

describe('InZoneMcpTools', () => {
  it('lists boards scoped to the authenticated user', async () => {
    const prisma = {
      board: {
        findMany: vi.fn(async () => [
          {
            id: 'board-1',
            name: 'Work',
            columns: [{ _count: { todos: 2 } }, { _count: { todos: 1 } }],
          },
        ]),
      },
    };
    const tools = new InZoneMcpTools(prisma as never, 'user-1');

    const result = await tools.listBoards();

    expect(prisma.board.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(textFrom(result)).toContain('"todoCount": 3');
  });

  it('prevents reading another user board', async () => {
    const prisma = {
      board: {
        findFirst: vi.fn(async () => null),
      },
    };
    const tools = new InZoneMcpTools(prisma as never, 'user-1');

    const result = await tools.getBoard({ id: 'other-board' });

    expect(prisma.board.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'other-board', userId: 'user-1' } }),
    );
    expect(result.isError).toBe(true);
    expect(textFrom(result as never)).toBe('Board not found');
  });

  it('creates todos only in columns owned by the authenticated user', async () => {
    const prisma = {
      column: {
        findUnique: vi.fn(async () => ({ id: 'col-1', board: { userId: 'other-user' } })),
      },
      todo: {
        aggregate: vi.fn(),
        create: vi.fn(),
      },
    };
    const tools = new InZoneMcpTools(prisma as never, 'user-1');

    const result = await tools.createTodo({ title: 'Task', columnId: 'col-1' });

    expect(result.isError).toBe(true);
    expect(textFrom(result as never)).toBe('Column not found');
    expect(prisma.todo.create).not.toHaveBeenCalled();
  });

  it('rejects cross-user todo access with a safe not-found error', async () => {
    const prisma = {
      todo: {
        findUnique: vi.fn(async () => ({
          id: 'todo-1',
          column: { board: { userId: 'other-user' } },
        })),
      },
    };
    const tools = new InZoneMcpTools(prisma as never, 'user-1');

    const result = await tools.getTodo({ id: 'todo-1' });

    expect(result.isError).toBe(true);
    expect(textFrom(result as never)).toBe('Todo not found');
  });
});
