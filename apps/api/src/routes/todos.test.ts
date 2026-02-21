import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import {
  createMockColumn,
  createMockTodo,
  createMockLabel,
  resetFactories,
} from "../test/factories.js";
import { Express } from "express";
import { Priority } from "@prisma/client";

describe("Todos Routes", () => {
  let app: Express;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    app = createTestApp();
  });

  // ===========================================
  // GET /api/todos - List todos
  // ===========================================
  describe("GET /api/todos", () => {
    describe("happy path", () => {
      it("returns 200 with todos list", async () => {
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

        const response = await request(app).get("/api/todos");

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });

      it("returns 200 with empty array when no todos", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        const response = await request(app).get("/api/todos");

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it("filters by columnId", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos").query({ columnId: "col-1" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              columnId: "col-1",
              column: expect.objectContaining({ board: { userId: "test-user-1" } }),
            }),
          })
        );
      });

      it("filters by boardId", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos").query({ boardId: "board-1" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              column: { board: { userId: "test-user-1" }, boardId: "board-1" },
            }),
          })
        );
      });

      it("filters by priority", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos").query({ priority: "HIGH" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              priority: "HIGH",
            }),
          })
        );
      });

      it("filters by labelId", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos").query({ labelId: "label-1" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              labels: { some: { id: "label-1" } },
            }),
          })
        );
      });

      it("searches by title", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos").query({ search: "bug" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              title: { contains: "bug", mode: "insensitive" },
            }),
          })
        );
      });

      it("includes archived todos when requested", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos").query({ archived: "true" });

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              archived: true,
            }),
          })
        );
      });

      it("excludes archived todos by default", async () => {
        prismaMock.todo.findMany.mockResolvedValue([]);

        await request(app).get("/api/todos");

        expect(prismaMock.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              archived: false,
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns 500 on database error", async () => {
        prismaMock.todo.findMany.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).get("/api/todos");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // POST /api/todos - Create todo
  // ===========================================
  describe("POST /api/todos", () => {
    describe("happy path", () => {
      it("returns 201 when todo created successfully", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "New Task" }),
          labels: [],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .post("/api/todos")
          .send({ title: "New Task", columnId: "col-1" });

        expect(response.status).toBe(201);
        expect(response.body.title).toBe("New Task");
      });

      it("creates todo with all fields", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };
        const mockTodo = {
          ...createMockTodo({
            id: "todo-1",
            title: "Full Task",
            description: "Description",
            priority: Priority.HIGH,
            dueDate: new Date("2025-02-01"),
          }),
          labels: [createMockLabel({ id: "label-1" })],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        const response = await request(app).post("/api/todos").send({
          title: "Full Task",
          description: "Description",
          priority: "HIGH",
          dueDate: "2025-02-01T00:00:00.000Z",
          columnId: "col-1",
          labelIds: ["label-1"],
        });

        expect(response.status).toBe(201);
        expect(response.body.priority).toBe("HIGH");
        expect(response.body.labels).toHaveLength(1);
      });

      it("creates todo with correct position", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", position: 3 }),
          labels: [],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.todo.create.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .post("/api/todos")
          .send({ title: "New Task", columnId: "col-1" });

        expect(response.status).toBe(201);
        expect(prismaMock.todo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              position: 3,
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when title is missing", async () => {
        const response = await request(app)
          .post("/api/todos")
          .send({ columnId: "col-1" });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when title is empty", async () => {
        const response = await request(app)
          .post("/api/todos")
          .send({ title: "", columnId: "col-1" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when title exceeds max length", async () => {
        const response = await request(app)
          .post("/api/todos")
          .send({ title: "A".repeat(201), columnId: "col-1" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when columnId is missing", async () => {
        const response = await request(app)
          .post("/api/todos")
          .send({ title: "Task" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when priority is invalid", async () => {
        const response = await request(app)
          .post("/api/todos")
          .send({ title: "Task", columnId: "col-1", priority: "INVALID" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when dueDate is invalid format", async () => {
        const response = await request(app)
          .post("/api/todos")
          .send({ title: "Task", columnId: "col-1", dueDate: "not-a-date" });

        expect(response.status).toBe(400);
      });

      it("returns 404 when column not found", async () => {
        prismaMock.column.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .post("/api/todos")
          .send({ title: "Task", columnId: "non-existent" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Column not found");
      });

      it("returns 500 on database error", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.todo.create.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .post("/api/todos")
          .send({ title: "Task", columnId: "col-1" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // GET /api/todos/:id - Get todo by ID
  // ===========================================
  describe("GET /api/todos/:id", () => {
    describe("happy path", () => {
      it("returns 200 with todo details", async () => {
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "My Task" }),
          labels: [createMockLabel({ id: "label-1", name: "Bug" })],
          column: { id: "col-1", name: "Todo", boardId: "board-1", board: { userId: "test-user-1" } },
        };

        prismaMock.todo.findUnique.mockResolvedValue(mockTodo as any);

        const response = await request(app).get("/api/todos/todo-1");

        expect(response.status).toBe(200);
        expect(response.body.id).toBe("todo-1");
        expect(response.body.title).toBe("My Task");
        expect(response.body.labels).toHaveLength(1);
        expect(response.body.column).toBeDefined();
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when todo not found", async () => {
        prismaMock.todo.findUnique.mockResolvedValue(null);

        const response = await request(app).get("/api/todos/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Todo not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.todo.findUnique.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).get("/api/todos/todo-1");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PUT /api/todos/:id - Update todo
  // ===========================================
  describe("PUT /api/todos/:id", () => {
    describe("happy path", () => {
      it("returns 200 with updated todo", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "Updated Title" }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ title: "Updated Title" });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe("Updated Title");
      });

      it("updates todo description", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", description: "New Description" }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ description: "New Description" });

        expect(response.status).toBe(200);
        expect(response.body.description).toBe("New Description");
      });

      it("updates todo priority", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", priority: Priority.URGENT }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ priority: "URGENT" });

        expect(response.status).toBe(200);
        expect(response.body.priority).toBe("URGENT");
      });

      it("updates todo due date", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", dueDate: new Date("2025-03-01") }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ dueDate: "2025-03-01T00:00:00.000Z" });

        expect(response.status).toBe(200);
      });

      it("clears due date when set to null", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", dueDate: null }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ dueDate: null });

        expect(response.status).toBe(200);
        expect(response.body.dueDate).toBeNull();
      });

      it("updates labels", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1" }),
          labels: [createMockLabel({ id: "label-2", name: "Feature" })],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ labelIds: ["label-2"] });

        expect(response.status).toBe(200);
        expect(response.body.labels).toHaveLength(1);
        expect(response.body.labels[0].name).toBe("Feature");
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when title is empty", async () => {
        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ title: "" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when title exceeds max length", async () => {
        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ title: "A".repeat(201) });

        expect(response.status).toBe(400);
      });

      it("returns 400 when priority is invalid", async () => {
        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ priority: "INVALID" });

        expect(response.status).toBe(400);
      });

      it("returns 404 when todo not found", async () => {
        prismaMock.todo.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .put("/api/todos/non-existent")
          .send({ title: "Updated" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Todo not found");
      });

      it("returns 500 on database error", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .put("/api/todos/todo-1")
          .send({ title: "Updated" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // DELETE /api/todos/:id - Delete todo
  // ===========================================
  describe("DELETE /api/todos/:id", () => {
    describe("happy path", () => {
      it("returns 204 when todo deleted successfully", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.delete.mockResolvedValue(
          createMockTodo({ id: "todo-1" }) as any
        );

        const response = await request(app).delete("/api/todos/todo-1");

        expect(response.status).toBe(204);
        expect(prismaMock.todo.delete).toHaveBeenCalledWith({
          where: { id: "todo-1" },
        });
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when todo not found", async () => {
        prismaMock.todo.findUnique.mockResolvedValue(null);

        const response = await request(app).delete("/api/todos/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Todo not found");
      });

      it("returns 500 on database error", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.delete.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).delete("/api/todos/todo-1");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PATCH /api/todos/:id/move - Move todo
  // ===========================================
  describe("PATCH /api/todos/:id/move", () => {
    describe("happy path", () => {
      it("returns 200 when todo moved successfully", async () => {
        const mockTargetColumn = { ...createMockColumn({ id: "col-2" }), board: { userId: "test-user-1" } };
        const existingTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-2" }),
          labels: [],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockTargetColumn as any);
        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({ columnId: "col-2" });

        expect(response.status).toBe(200);
        expect(response.body.columnId).toBe("col-2");
      });

      it("moves todo to specific position", async () => {
        const mockTargetColumn = { ...createMockColumn({ id: "col-2" }), board: { userId: "test-user-1" } };
        const existingTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", columnId: "col-2", position: 0 }),
          labels: [],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockTargetColumn as any);
        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.updateMany.mockResolvedValue({ count: 3 });
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({ columnId: "col-2", position: 0 });

        expect(response.status).toBe(200);
        expect(prismaMock.todo.updateMany).toHaveBeenCalled();
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when columnId is missing", async () => {
        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({});

        expect(response.status).toBe(400);
      });

      it("returns 400 when position is negative", async () => {
        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({ columnId: "col-2", position: -1 });

        expect(response.status).toBe(400);
      });

      it("returns 404 when target column not found", async () => {
        prismaMock.column.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({ columnId: "non-existent" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Target column not found");
      });

      it("returns 404 when todo not found", async () => {
        const mockTargetColumn = { ...createMockColumn({ id: "col-2" }), board: { userId: "test-user-1" } };

        prismaMock.column.findUnique.mockResolvedValue(mockTargetColumn as any);
        prismaMock.todo.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({ columnId: "col-2" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Todo not found");
      });

      it("returns 500 on database error", async () => {
        const mockTargetColumn = { ...createMockColumn({ id: "col-2" }), board: { userId: "test-user-1" } };
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };

        prismaMock.column.findUnique.mockResolvedValue(mockTargetColumn as any);
        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .patch("/api/todos/todo-1/move")
          .send({ columnId: "col-2" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PATCH /api/todos/reorder - Reorder todos
  // ===========================================
  describe("PATCH /api/todos/reorder", () => {
    describe("happy path", () => {
      it("returns 200 with reordered todos", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };
        const todos = [
          { ...createMockTodo({ id: "todo-1", columnId: "col-1" }), labels: [] },
          { ...createMockTodo({ id: "todo-2", columnId: "col-1" }), labels: [] },
        ];

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findMany
          .mockResolvedValueOnce(todos as any) // Verification query
          .mockResolvedValueOnce(todos as any); // Final fetch
        prismaMock.$transaction.mockResolvedValue([]);

        const response = await request(app)
          .patch("/api/todos/reorder")
          .send({
            columnId: "col-1",
            todos: [
              { id: "todo-1", position: 1 },
              { id: "todo-2", position: 0 },
            ],
          });

        expect(response.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when columnId is missing", async () => {
        const response = await request(app)
          .patch("/api/todos/reorder")
          .send({
            todos: [{ id: "todo-1", position: 0 }],
          });

        expect(response.status).toBe(400);
      });

      it("returns 400 when todo position is negative", async () => {
        const response = await request(app)
          .patch("/api/todos/reorder")
          .send({
            columnId: "col-1",
            todos: [{ id: "todo-1", position: -1 }],
          });

        expect(response.status).toBe(400);
      });

      it("returns 400 when todo ID is not in column", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };
        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findMany.mockResolvedValue([] as any);

        const response = await request(app)
          .patch("/api/todos/reorder")
          .send({
            columnId: "col-1",
            todos: [
              { id: "todo-1", position: 0 },
              { id: "todo-2", position: 1 },
            ],
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid todo IDs or column mismatch");
      });

      it("returns 500 on database error", async () => {
        const mockColumn = { ...createMockColumn({ id: "col-1" }), board: { userId: "test-user-1" } };
        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.todo.findMany.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .patch("/api/todos/reorder")
          .send({
            columnId: "col-1",
            todos: [{ id: "todo-1", position: 0 }],
          });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PATCH /api/todos/:id/archive - Archive todo
  // ===========================================
  describe("PATCH /api/todos/:id/archive", () => {
    describe("happy path", () => {
      it("returns 200 when todo archived", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", archived: true }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .patch("/api/todos/todo-1/archive")
          .send({ archived: true });

        expect(response.status).toBe(200);
        expect(response.body.archived).toBe(true);
      });

      it("returns 200 when todo unarchived", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", archived: false }),
          labels: [],
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockResolvedValue(mockTodo as any);

        const response = await request(app)
          .patch("/api/todos/todo-1/archive")
          .send({ archived: false });

        expect(response.status).toBe(200);
        expect(response.body.archived).toBe(false);
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when archived is missing", async () => {
        const response = await request(app)
          .patch("/api/todos/todo-1/archive")
          .send({});

        expect(response.status).toBe(400);
      });

      it("returns 400 when archived is not boolean", async () => {
        const response = await request(app)
          .patch("/api/todos/todo-1/archive")
          .send({ archived: "yes" });

        expect(response.status).toBe(400);
      });

      it("returns 404 when todo not found", async () => {
        prismaMock.todo.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .patch("/api/todos/non-existent/archive")
          .send({ archived: true });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Todo not found");
      });

      it("returns 500 on database error", async () => {
        const existingTodo = {
          ...createMockTodo({ id: "todo-1" }),
          column: { board: { userId: "test-user-1" } },
        };

        prismaMock.todo.findUnique.mockResolvedValue(existingTodo as any);
        prismaMock.todo.update.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .patch("/api/todos/todo-1/archive")
          .send({ archived: true });

        expect(response.status).toBe(500);
      });
    });
  });
});
