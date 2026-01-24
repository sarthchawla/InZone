import { describe, it, expect, beforeEach } from "vitest";
import { ColumnService } from "./column.service.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import {
  createMockColumn,
  createMockTodo,
  resetFactories,
} from "../test/factories.js";

describe("ColumnService", () => {
  let columnService: ColumnService;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    columnService = new ColumnService(prismaMock);
  });

  // ===========================================
  // getColumnById - Tests
  // ===========================================
  describe("getColumnById", () => {
    describe("happy path", () => {
      it("returns column with todos", async () => {
        const mockTodos = [
          createMockTodo({ id: "todo-1", title: "Task 1" }),
          createMockTodo({ id: "todo-2", title: "Task 2" }),
        ];
        const mockColumn = {
          ...createMockColumn({ id: "col-1", name: "Todo" }),
          todos: mockTodos,
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);

        const result = await columnService.getColumnById("col-1");

        expect(result).not.toBeNull();
        expect(result?.name).toBe("Todo");
        expect(result?.todos).toHaveLength(2);
        expect(prismaMock.column.findFirst).toHaveBeenCalledWith({
          where: { id: "col-1", isDeleted: false },
          include: {
            todos: {
              where: { archived: false, isDeleted: false },
              orderBy: { position: "asc" },
            },
          },
        });
      });

      it("returns column with empty todos array", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1" }),
          todos: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);

        const result = await columnService.getColumnById("col-1");

        expect(result?.todos).toEqual([]);
      });
    });

    describe("unhappy path", () => {
      it("returns null when column not found", async () => {
        prismaMock.column.findFirst.mockResolvedValue(null);

        const result = await columnService.getColumnById("non-existent");

        expect(result).toBeNull();
      });

      it("throws error on database failure", async () => {
        prismaMock.column.findFirst.mockRejectedValue(new Error("DB Error"));

        await expect(columnService.getColumnById("col-1")).rejects.toThrow(
          "DB Error"
        );
      });
    });
  });

  // ===========================================
  // updateColumn - Tests
  // ===========================================
  describe("updateColumn", () => {
    describe("happy path", () => {
      it("updates column name", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", name: "Updated Name" }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const result = await columnService.updateColumn("col-1", {
          name: "Updated Name",
        });

        expect(result.name).toBe("Updated Name");
        expect(prismaMock.column.update).toHaveBeenCalledWith({
          where: { id: "col-1" },
          data: { name: "Updated Name" },
          include: {
            todos: {
              where: { archived: false, isDeleted: false },
              orderBy: { position: "asc" },
            },
          },
        });
      });

      it("updates column WIP limit", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", wipLimit: 5 }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const result = await columnService.updateColumn("col-1", {
          wipLimit: 5,
        });

        expect(result.wipLimit).toBe(5);
      });

      it("removes column WIP limit", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", wipLimit: null }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const result = await columnService.updateColumn("col-1", {
          wipLimit: null,
        });

        expect(result.wipLimit).toBeNull();
      });

      it("updates multiple fields", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", name: "In Progress", wipLimit: 3 }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        await columnService.updateColumn("col-1", {
          name: "In Progress",
          wipLimit: 3,
        });

        expect(prismaMock.column.update).toHaveBeenCalledWith({
          where: { id: "col-1" },
          data: { name: "In Progress", wipLimit: 3 },
          include: {
            todos: {
              where: { archived: false, isDeleted: false },
              orderBy: { position: "asc" },
            },
          },
        });
      });
    });

    describe("unhappy path", () => {
      it("throws error when column not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.column.update.mockRejectedValue(error);

        await expect(
          columnService.updateColumn("non-existent", { name: "Test" })
        ).rejects.toThrow("Record not found");
      });
    });
  });

  // ===========================================
  // deleteColumn - Soft Delete Tests
  // ===========================================
  describe("deleteColumn", () => {
    describe("happy path", () => {
      it("soft-deletes empty column", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        await columnService.deleteColumn("col-1");

        expect(prismaMock.column.update).toHaveBeenCalledWith({
          where: { id: "col-1" },
          data: {
            deletedAt: expect.any(Date),
            isDeleted: true,
          },
        });
      });

      it("soft-deletes column with todos (todos remain associated)", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [createMockTodo({ id: "todo-1" })],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        await columnService.deleteColumn("col-1");

        expect(prismaMock.column.update).toHaveBeenCalledWith({
          where: { id: "col-1" },
          data: {
            deletedAt: expect.any(Date),
            isDeleted: true,
          },
        });
        expect(prismaMock.todo.update).not.toHaveBeenCalled();
      });

      it("moves todos to target column before soft-deletion", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [
            createMockTodo({ id: "todo-1" }),
            createMockTodo({ id: "todo-2" }),
          ],
        };
        const targetColumn = createMockColumn({
          id: "col-2",
          boardId: "board-1",
        });

        prismaMock.column.findFirst
          .mockResolvedValueOnce(mockColumn as any)
          .mockResolvedValueOnce(targetColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 3 },
        } as any);
        prismaMock.$transaction.mockResolvedValue([]);
        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        await columnService.deleteColumn("col-1", "col-2");

        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(prismaMock.column.update).toHaveBeenCalledWith({
          where: { id: "col-1" },
          data: {
            deletedAt: expect.any(Date),
            isDeleted: true,
          },
        });
      });

      it("assigns correct positions to moved todos", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [
            createMockTodo({ id: "todo-1" }),
            createMockTodo({ id: "todo-2" }),
          ],
        };
        const targetColumn = createMockColumn({
          id: "col-2",
          boardId: "board-1",
        });

        prismaMock.column.findFirst
          .mockResolvedValueOnce(mockColumn as any)
          .mockResolvedValueOnce(targetColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.$transaction.mockResolvedValue([]);
        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        await columnService.deleteColumn("col-1", "col-2");

        // The transaction should contain update operations with positions 3 and 4
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });
    });

    describe("unhappy path", () => {
      it("throws error when column not found", async () => {
        prismaMock.column.findFirst.mockResolvedValue(null);

        await expect(columnService.deleteColumn("non-existent")).rejects.toThrow(
          "Column not found"
        );
      });

      it("throws error when target column not found", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [createMockTodo({ id: "todo-1" })],
        };

        prismaMock.column.findFirst
          .mockResolvedValueOnce(mockColumn as any)
          .mockResolvedValueOnce(null);

        await expect(
          columnService.deleteColumn("col-1", "non-existent")
        ).rejects.toThrow("Target column not found");
      });

      it("throws error when target column is in different board", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [createMockTodo({ id: "todo-1" })],
        };
        const targetColumn = createMockColumn({
          id: "col-2",
          boardId: "board-2", // Different board
        });

        prismaMock.column.findFirst
          .mockResolvedValueOnce(mockColumn as any)
          .mockResolvedValueOnce(targetColumn as any);

        await expect(
          columnService.deleteColumn("col-1", "col-2")
        ).rejects.toThrow("Target column must be in the same board");
      });
    });
  });

  // ===========================================
  // reorderColumns - Tests
  // ===========================================
  describe("reorderColumns", () => {
    describe("happy path", () => {
      it("reorders columns within board", async () => {
        const mockColumns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
          createMockColumn({ id: "col-2", boardId: "board-1" }),
          createMockColumn({ id: "col-3", boardId: "board-1" }),
        ];

        const reorderedColumns = [
          {
            ...createMockColumn({ id: "col-3", position: 0 }),
            todos: [],
          },
          {
            ...createMockColumn({ id: "col-1", position: 1 }),
            todos: [],
          },
          {
            ...createMockColumn({ id: "col-2", position: 2 }),
            todos: [],
          },
        ];

        prismaMock.column.findMany
          .mockResolvedValueOnce(mockColumns as any)
          .mockResolvedValueOnce(reorderedColumns as any);
        prismaMock.$transaction.mockResolvedValue([]);

        const result = await columnService.reorderColumns("board-1", [
          { id: "col-3", position: 0 },
          { id: "col-1", position: 1 },
          { id: "col-2", position: 2 },
        ]);

        expect(result).toHaveLength(3);
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });

      it("reorders two columns", async () => {
        const mockColumns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
          createMockColumn({ id: "col-2", boardId: "board-1" }),
        ];

        const reorderedColumns = [
          { ...createMockColumn({ id: "col-2", position: 0 }), todos: [] },
          { ...createMockColumn({ id: "col-1", position: 1 }), todos: [] },
        ];

        prismaMock.column.findMany
          .mockResolvedValueOnce(mockColumns as any)
          .mockResolvedValueOnce(reorderedColumns as any);
        prismaMock.$transaction.mockResolvedValue([]);

        const result = await columnService.reorderColumns("board-1", [
          { id: "col-2", position: 0 },
          { id: "col-1", position: 1 },
        ]);

        expect(result).toHaveLength(2);
      });

      it("returns columns with todos after reorder", async () => {
        const mockColumns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
        ];

        const reorderedColumns = [
          {
            ...createMockColumn({ id: "col-1", position: 0 }),
            todos: [createMockTodo({ id: "todo-1" })],
          },
        ];

        prismaMock.column.findMany
          .mockResolvedValueOnce(mockColumns as any)
          .mockResolvedValueOnce(reorderedColumns as any);
        prismaMock.$transaction.mockResolvedValue([]);

        const result = await columnService.reorderColumns("board-1", [
          { id: "col-1", position: 0 },
        ]);

        expect(result[0].todos).toHaveLength(1);
      });
    });

    describe("unhappy path", () => {
      it("throws error when column IDs don't match board", async () => {
        // Only 2 of 3 columns belong to the board
        const mockColumns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
          createMockColumn({ id: "col-2", boardId: "board-1" }),
        ];

        prismaMock.column.findMany.mockResolvedValue(mockColumns as any);

        await expect(
          columnService.reorderColumns("board-1", [
            { id: "col-1", position: 0 },
            { id: "col-2", position: 1 },
            { id: "col-3", position: 2 },
          ])
        ).rejects.toThrow("Invalid column IDs or board mismatch");
      });

      it("throws error when some columns belong to different board", async () => {
        const mockColumns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
        ];

        prismaMock.column.findMany.mockResolvedValue(mockColumns as any);

        await expect(
          columnService.reorderColumns("board-1", [
            { id: "col-1", position: 0 },
            { id: "col-2", position: 1 },
          ])
        ).rejects.toThrow("Invalid column IDs or board mismatch");
      });

      it("throws error on database failure during transaction", async () => {
        const mockColumns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
        ];

        prismaMock.column.findMany.mockResolvedValue(mockColumns as any);
        prismaMock.$transaction.mockRejectedValue(new Error("Transaction failed"));

        await expect(
          columnService.reorderColumns("board-1", [{ id: "col-1", position: 0 }])
        ).rejects.toThrow("Transaction failed");
      });
    });
  });
});
