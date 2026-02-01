import { describe, it, expect, beforeEach } from "vitest";
import { TodoService } from "./todo.service.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import {
  createMockTodo,
  createMockColumn,
  createMockLabel,
  resetFactories,
} from "../test/factories.js";
import { Priority } from "@prisma/client";

describe("TodoService", () => {
  let todoService: TodoService;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    todoService = new TodoService(prismaMock);
  });

  // ===========================================
  // getTodos - Tests
  // ===========================================
  describe("getTodos", () => {
    describe("happy path", () => {
      it("returns all non-archived todos by default", async () => {
        const mockTodos = [
          {
            ...createMockTodo({ id: "todo-1", title: "Task 1" }),
            labels: [],
            column: { id: "col-1", name: "Todo", boardId: "board-1" },
          },
          {
            ...createMockTodo({ id: "todo-2", title: "Task 2" }),
            labels: [],
            column: { id: "col-1", name: "Todo", boardId: "board-1" },
          },
        ];

        prismaMock.todo.findMany.mockResolvedValue(mockTodos as any);

        const result = await todoService.getTodos();

        expect(result).toHaveLength(2);
        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { archived: false, isDeleted: false },
          })
        );
      });

      it("filters by columnId", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({ columnId: "col-1" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ columnId: "col-1" }),
          })
        );
      });

      it("filters by boardId", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({ boardId: "board-1" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              column: { boardId: "board-1", isDeleted: false },
            }),
          })
        );
      });

      it("filters archived todos", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({ archived: true });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ archived: true }),
          })
        );
      });

      it("filters by priority", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({ priority: Priority.HIGH });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ priority: Priority.HIGH }),
          })
        );
      });

      it("filters by labelId", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({ labelId: "label-1" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              labels: { some: { id: "label-1" } },
            }),
          })
        );
      });

      it("filters by search term", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({ search: "bug" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              title: { contains: "bug", mode: "insensitive" },
            }),
          })
        );
      });

      it("combines multiple filters", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await todoService.getTodos({
          columnId: "col-1",
          priority: Priority.HIGH,
          search: "urgent",
        });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              columnId: "col-1",
              priority: Priority.HIGH,
              title: { contains: "urgent", mode: "insensitive" },
            }),
          })
        );
      });

      it("returns empty array when no todos match", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        const result = await todoService.getTodos({ search: "nonexistent" });

        expect(result).toEqual([]);
      });
    });

    describe("unhappy path", () => {
      it("throws error on database failure", async () => {
        prismaMock.todo.findMany.mockRejectedValue(new Error("DB Error"));

        await expect(todoService.getTodos()).rejects.toThrow("DB Error");
      });
    });
  });

  // ===========================================
  // getTodoById - Tests
  // ===========================================
  describe("getTodoById", () => {
    describe("happy path", () => {
      it("returns todo with labels and column info", async () => {
        const mockLabel = createMockLabel({ id: "label-1", name: "Bug" });
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "Fix bug" }),
          labels: [mockLabel],
          column: { id: "col-1", name: "Todo", boardId: "board-1" },
        };

        prismaMock.todo.findFirst.mockResolvedValue(mockTodo as any);

        const result = await todoService.getTodoById("todo-1");

        expect(result).not.toBeNull();
        expect(result?.title).toBe("Fix bug");
        expect(result?.labels).toHaveLength(1);
        expect(result?.column.name).toBe("Todo");
      });
    });

    describe("unhappy path", () => {
      it("returns null when todo not found", async () => {
        prismaMock.todo.findFirst.mockResolvedValue(null);

        const result = await todoService.getTodoById("non-existent");

        expect(result).toBeNull();
      });
    });
  });

  // ===========================================
  // createTodo - Tests
  // ===========================================
  describe("createTodo", () => {
    describe("happy path", () => {
      it("creates todo with required fields only", async () => {
        const mockColumn = createMockColumn({ id: "col-1" });
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "New Task", columnId: "col-1" }),
          labels: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        const result = await todoService.createTodo({
          title: "New Task",
          columnId: "col-1",
        });

        expect(result).not.toBeNull();
        expect(result?.title).toBe("New Task");
        expect(prismaMock.todo.create).toHaveBeenCalledWith({
          data: {
            title: "New Task",
            description: undefined,
            priority: undefined,
            dueDate: null,
            position: 0,
            columnId: "col-1",
            labels: undefined,
          },
          include: { labels: true },
        });
      });

      it("creates todo with all fields", async () => {
        const mockColumn = createMockColumn({ id: "col-1" });
        const mockLabel = createMockLabel({ id: "label-1" });
        const dueDate = new Date("2025-02-01T00:00:00.000Z");
        const mockTodo = {
          ...createMockTodo({
            id: "todo-1",
            title: "Full Todo",
            description: "Description",
            priority: Priority.HIGH,
            dueDate,
          }),
          labels: [mockLabel],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 5 },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        const result = await todoService.createTodo({
          title: "Full Todo",
          description: "Description",
          priority: Priority.HIGH,
          dueDate: "2025-02-01T00:00:00.000Z",
          columnId: "col-1",
          labelIds: ["label-1"],
        });

        expect(result?.priority).toBe(Priority.HIGH);
        expect(prismaMock.todo.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            position: 6,
            labels: { connect: [{ id: "label-1" }] },
          }),
          include: { labels: true },
        });
      });

      it("assigns correct position when column has existing todos", async () => {
        const mockColumn = createMockColumn({ id: "col-1" });
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", position: 10 }),
          labels: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 9 },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        await todoService.createTodo({
          title: "New Task",
          columnId: "col-1",
        });

        expect(prismaMock.todo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ position: 10 }),
          })
        );
      });

      it("creates todo with multiple labels", async () => {
        const mockColumn = createMockColumn({ id: "col-1" });
        const mockTodo = {
          ...createMockTodo({ id: "todo-1" }),
          labels: [
            createMockLabel({ id: "label-1" }),
            createMockLabel({ id: "label-2" }),
          ],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        await todoService.createTodo({
          title: "Task",
          columnId: "col-1",
          labelIds: ["label-1", "label-2"],
        });

        expect(prismaMock.todo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              labels: {
                connect: [{ id: "label-1" }, { id: "label-2" }],
              },
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns null when column not found", async () => {
        prismaMock.column.findFirst.mockResolvedValue(null);

        const result = await todoService.createTodo({
          title: "New Task",
          columnId: "non-existent",
        });

        expect(result).toBeNull();
        expect(prismaMock.todo.create).not.toHaveBeenCalled();
      });

      it("throws error on database error during creation", async () => {
        const mockColumn = createMockColumn({ id: "col-1" });
        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.create.mockRejectedValue(new Error("DB Error"));

        await expect(
          todoService.createTodo({ title: "New Task", columnId: "col-1" })
        ).rejects.toThrow("DB Error");
      });
    });
  });

  // ===========================================
  // updateTodo - Tests
  // ===========================================
  describe("updateTodo", () => {
    describe("happy path", () => {
      it("updates todo title", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "Updated Title" }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.updateTodo("todo-1", {
          title: "Updated Title",
        });

        expect(result.title).toBe("Updated Title");
      });

      it("updates todo priority", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", priority: Priority.URGENT }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.updateTodo("todo-1", {
          priority: Priority.URGENT,
        });

        expect(result.priority).toBe(Priority.URGENT);
      });

      it("updates todo description to null", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", description: null }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.updateTodo("todo-1", {
          description: null,
        });

        expect(result.description).toBeNull();
      });

      it("updates todo due date", async () => {
        const dueDate = new Date("2025-03-15T00:00:00.000Z");
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", dueDate }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.updateTodo("todo-1", {
          dueDate: "2025-03-15T00:00:00.000Z",
        });

        expect(result.dueDate).toEqual(dueDate);
      });

      it("clears todo due date", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", dueDate: null }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.updateTodo("todo-1", {
          dueDate: null,
        });

        expect(result.dueDate).toBeNull();
      });

      it("updates todo labels", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1" }),
          labels: [createMockLabel({ id: "label-2" })],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        await todoService.updateTodo("todo-1", {
          labelIds: ["label-2"],
        });

        expect(prismaMock.todo.update).toHaveBeenCalledWith({
          where: { id: "todo-1" },
          data: {
            labels: { set: [{ id: "label-2" }] },
          },
          include: { labels: true },
        });
      });

      it("updates multiple fields at once", async () => {
        const mockTodo = {
          ...createMockTodo({
            id: "todo-1",
            title: "New",
            priority: Priority.LOW,
          }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        await todoService.updateTodo("todo-1", {
          title: "New",
          priority: Priority.LOW,
          description: "Desc",
        });

        expect(prismaMock.todo.update).toHaveBeenCalledWith({
          where: { id: "todo-1" },
          data: {
            title: "New",
            priority: Priority.LOW,
            description: "Desc",
          },
          include: { labels: true },
        });
      });
    });

    describe("unhappy path", () => {
      it("throws error when todo not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.todo.update.mockRejectedValue(error);

        await expect(
          todoService.updateTodo("non-existent", { title: "Test" })
        ).rejects.toThrow("Record not found");
      });
    });
  });

  // ===========================================
  // deleteTodo - Soft Delete Tests
  // ===========================================
  describe("deleteTodo", () => {
    describe("happy path", () => {
      it("soft-deletes todo successfully", async () => {
        prismaMock.todo.update.mockResolvedValue(
          createMockTodo({ id: "todo-1" }) as any
        );

        await todoService.deleteTodo("todo-1");

        expect(prismaMock.todo.update).toHaveBeenCalledWith({
          where: { id: "todo-1" },
          data: {
            deletedAt: expect.any(Date),
            isDeleted: true,
          },
        });
      });
    });

    describe("unhappy path", () => {
      it("throws error when todo not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.todo.update.mockRejectedValue(error);

        await expect(todoService.deleteTodo("non-existent")).rejects.toThrow(
          "Record not found"
        );
      });
    });
  });

  // ===========================================
  // moveTodo - Tests
  // ===========================================
  describe("moveTodo", () => {
    describe("happy path", () => {
      it("moves todo to end of target column", async () => {
        const mockColumn = createMockColumn({ id: "col-2" });
        const mockTodo = createMockTodo({ id: "todo-1", columnId: "col-1" });
        const movedTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-2", position: 5 }),
          labels: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findFirst.mockResolvedValue(mockTodo as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 4 },
        } as any);
        prismaMock.todo.update.mockResolvedValue(movedTodo as any);

        const result = await todoService.moveTodo("todo-1", "col-2");

        expect(result?.columnId).toBe("col-2");
        expect(result?.position).toBe(5);
      });

      it("moves todo to specific position and shifts others", async () => {
        const mockColumn = createMockColumn({ id: "col-2" });
        const mockTodo = createMockTodo({ id: "todo-1", columnId: "col-1" });
        const movedTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-2", position: 2 }),
          labels: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findFirst.mockResolvedValue(mockTodo as any);
        prismaMock.todo.updateMany.mockResolvedValue({ count: 3 });
        prismaMock.todo.update.mockResolvedValue(movedTodo as any);

        const result = await todoService.moveTodo("todo-1", "col-2", 2);

        expect(result?.position).toBe(2);
        expect(prismaMock.todo.updateMany).toHaveBeenCalledWith({
          where: {
            columnId: "col-2",
            isDeleted: false,
            position: { gte: 2 },
          },
          data: {
            position: { increment: 1 },
          },
        });
      });

      it("moves todo to first position", async () => {
        const mockColumn = createMockColumn({ id: "col-2" });
        const mockTodo = createMockTodo({ id: "todo-1" });
        const movedTodo = {
          ...createMockTodo({ id: "todo-1", position: 0 }),
          labels: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findFirst.mockResolvedValue(mockTodo as any);
        prismaMock.todo.updateMany.mockResolvedValue({ count: 5 });
        prismaMock.todo.update.mockResolvedValue(movedTodo as any);

        const result = await todoService.moveTodo("todo-1", "col-2", 0);

        expect(result?.position).toBe(0);
      });

      it("moves todo to empty column", async () => {
        const mockColumn = createMockColumn({ id: "col-2" });
        const mockTodo = createMockTodo({ id: "todo-1" });
        const movedTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-2", position: 0 }),
          labels: [],
        };

        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findFirst.mockResolvedValue(mockTodo as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.update.mockResolvedValue(movedTodo as any);

        const result = await todoService.moveTodo("todo-1", "col-2");

        expect(result?.position).toBe(0);
      });
    });

    describe("unhappy path", () => {
      it("throws error when target column not found", async () => {
        prismaMock.column.findFirst.mockResolvedValue(null);

        await expect(
          todoService.moveTodo("todo-1", "non-existent")
        ).rejects.toThrow("Target column not found");
      });

      it("returns null when todo not found", async () => {
        const mockColumn = createMockColumn({ id: "col-2" });
        prismaMock.column.findFirst.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findFirst.mockResolvedValue(null);

        const result = await todoService.moveTodo("non-existent", "col-2");

        expect(result).toBeNull();
      });
    });
  });

  // ===========================================
  // reorderTodos - Tests
  // ===========================================
  describe("reorderTodos", () => {
    describe("happy path", () => {
      it("reorders todos within column", async () => {
        const mockTodos = [
          createMockTodo({ id: "todo-1", columnId: "col-1" }),
          createMockTodo({ id: "todo-2", columnId: "col-1" }),
          createMockTodo({ id: "todo-3", columnId: "col-1" }),
        ];

        const reorderedTodos = [
          { ...createMockTodo({ id: "todo-3", position: 0 }), labels: [] },
          { ...createMockTodo({ id: "todo-1", position: 1 }), labels: [] },
          { ...createMockTodo({ id: "todo-2", position: 2 }), labels: [] },
        ];

        prismaMock.todo.findMany
          .mockResolvedValueOnce(mockTodos as any)
          .mockResolvedValueOnce(reorderedTodos as any);
        prismaMock.$transaction.mockResolvedValue([]);

        const result = await todoService.reorderTodos("col-1", [
          { id: "todo-3", position: 0 },
          { id: "todo-1", position: 1 },
          { id: "todo-2", position: 2 },
        ]);

        expect(result).toHaveLength(3);
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });

      it("reorders single todo", async () => {
        const mockTodos = [createMockTodo({ id: "todo-1", columnId: "col-1" })];
        const reorderedTodos = [
          { ...createMockTodo({ id: "todo-1", position: 0 }), labels: [] },
        ];

        prismaMock.todo.findMany
          .mockResolvedValueOnce(mockTodos as any)
          .mockResolvedValueOnce(reorderedTodos as any);
        prismaMock.$transaction.mockResolvedValue([]);

        const result = await todoService.reorderTodos("col-1", [
          { id: "todo-1", position: 0 },
        ]);

        expect(result).toHaveLength(1);
      });
    });

    describe("unhappy path", () => {
      it("throws error when todo IDs don't match column", async () => {
        // Only 2 of 3 todos belong to the column
        const mockTodos = [
          createMockTodo({ id: "todo-1", columnId: "col-1" }),
          createMockTodo({ id: "todo-2", columnId: "col-1" }),
        ];

        prismaMock.todo.findMany.mockResolvedValue(mockTodos as any);

        await expect(
          todoService.reorderTodos("col-1", [
            { id: "todo-1", position: 0 },
            { id: "todo-2", position: 1 },
            { id: "todo-3", position: 2 },
          ])
        ).rejects.toThrow("Invalid todo IDs or column mismatch");
      });

      it("throws error when some todos belong to different column", async () => {
        const mockTodos = [
          createMockTodo({ id: "todo-1", columnId: "col-1" }),
        ];

        prismaMock.todo.findMany.mockResolvedValue(mockTodos as any);

        await expect(
          todoService.reorderTodos("col-1", [
            { id: "todo-1", position: 0 },
            { id: "todo-2", position: 1 }, // This one doesn't belong
          ])
        ).rejects.toThrow("Invalid todo IDs or column mismatch");
      });
    });
  });

  // ===========================================
  // archiveTodo - Tests
  // ===========================================
  describe("archiveTodo", () => {
    describe("happy path", () => {
      it("archives todo", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", archived: true }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.archiveTodo("todo-1", true);

        expect(result.archived).toBe(true);
        expect(prismaMock.todo.update).toHaveBeenCalledWith({
          where: { id: "todo-1" },
          data: { archived: true },
          include: { labels: true },
        });
      });

      it("unarchives todo", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", archived: false }),
          labels: [],
        };

        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const result = await todoService.archiveTodo("todo-1", false);

        expect(result.archived).toBe(false);
      });
    });

    describe("unhappy path", () => {
      it("throws error when todo not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.todo.update.mockRejectedValue(error);

        await expect(
          todoService.archiveTodo("non-existent", true)
        ).rejects.toThrow("Record not found");
      });
    });
  });
});
