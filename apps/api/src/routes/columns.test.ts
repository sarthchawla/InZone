import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import {
  createMockColumn,
  createMockTodo,
  resetFactories,
} from "../test/factories.js";
import { Express } from "express";

describe("Columns Routes", () => {
  let app: Express;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    app = createTestApp();
  });

  // ===========================================
  // PUT /api/columns/:id - Update column
  // ===========================================
  describe("PUT /api/columns/:id", () => {
    describe("happy path", () => {
      it("returns 200 with updated column", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", name: "Updated Name" }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ name: "Updated Name" });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("Updated Name");
      });

      it("updates column WIP limit", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", wipLimit: 5 }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ wipLimit: 5 });

        expect(response.status).toBe(200);
        expect(response.body.wipLimit).toBe(5);
      });

      it("clears WIP limit when set to null", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1", wipLimit: null }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ wipLimit: null });

        expect(response.status).toBe(200);
        expect(response.body.wipLimit).toBeNull();
      });

      it("updates both name and WIP limit", async () => {
        const mockColumn = {
          ...createMockColumn({
            id: "col-1",
            name: "In Progress",
            wipLimit: 3,
          }),
          todos: [],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ name: "In Progress", wipLimit: 3 });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("In Progress");
        expect(response.body.wipLimit).toBe(3);
      });

      it("returns column with todos", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1" }),
          todos: [
            createMockTodo({ id: "todo-1", title: "Task 1" }),
            createMockTodo({ id: "todo-2", title: "Task 2" }),
          ],
        };

        prismaMock.column.update.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ name: "Updated" });

        expect(response.status).toBe(200);
        expect(response.body.todos).toHaveLength(2);
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when name is empty", async () => {
        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ name: "" });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when name exceeds max length", async () => {
        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ name: "A".repeat(101) });

        expect(response.status).toBe(400);
      });

      it("returns 400 when WIP limit is zero", async () => {
        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ wipLimit: 0 });

        expect(response.status).toBe(400);
      });

      it("returns 400 when WIP limit is negative", async () => {
        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ wipLimit: -1 });

        expect(response.status).toBe(400);
      });

      it("returns 404 when column not found", async () => {
        const error: any = new Error("Record not found");
        error.code = "P2025";
        prismaMock.column.update.mockRejectedValue(error);

        const response = await request(app)
          .put("/api/columns/non-existent")
          .send({ name: "Updated" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Column not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.column.update.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .put("/api/columns/col-1")
          .send({ name: "Updated" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // DELETE /api/columns/:id - Delete column
  // ===========================================
  describe("DELETE /api/columns/:id", () => {
    describe("happy path", () => {
      it("returns 204 when column deleted successfully", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1" }),
          todos: [],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.column.delete.mockResolvedValue(mockColumn as any);

        const response = await request(app).delete("/api/columns/col-1");

        expect(response.status).toBe(204);
      });

      it("deletes column with todos", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1" }),
          todos: [
            createMockTodo({ id: "todo-1" }),
            createMockTodo({ id: "todo-2" }),
          ],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.column.delete.mockResolvedValue(mockColumn as any);

        const response = await request(app).delete("/api/columns/col-1");

        expect(response.status).toBe(204);
      });

      it("moves todos to target column before deleting", async () => {
        const mockColumnToDelete = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [
            createMockTodo({ id: "todo-1", position: 0 }),
            createMockTodo({ id: "todo-2", position: 1 }),
          ],
        };

        const mockTargetColumn = createMockColumn({
          id: "col-2",
          boardId: "board-1",
        });

        prismaMock.column.findUnique
          .mockResolvedValueOnce(mockColumnToDelete as any)
          .mockResolvedValueOnce(mockTargetColumn as any);
        prismaMock.todo.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.$transaction.mockResolvedValue([]);
        prismaMock.column.delete.mockResolvedValue(mockColumnToDelete as any);

        const response = await request(app)
          .delete("/api/columns/col-1")
          .query({ moveToColumnId: "col-2" });

        expect(response.status).toBe(204);
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when column not found", async () => {
        prismaMock.column.findUnique.mockResolvedValue(null);

        const response = await request(app).delete("/api/columns/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Column not found");
      });

      it("returns 400 when target column is in different board", async () => {
        const mockColumnToDelete = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [createMockTodo({ id: "todo-1" })],
        };

        const mockTargetColumn = createMockColumn({
          id: "col-2",
          boardId: "board-2", // Different board
        });

        prismaMock.column.findUnique
          .mockResolvedValueOnce(mockColumnToDelete as any)
          .mockResolvedValueOnce(mockTargetColumn as any);

        const response = await request(app)
          .delete("/api/columns/col-1")
          .query({ moveToColumnId: "col-2" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid target column");
      });

      it("returns 400 when target column does not exist", async () => {
        const mockColumnToDelete = {
          ...createMockColumn({ id: "col-1", boardId: "board-1" }),
          todos: [createMockTodo({ id: "todo-1" })],
        };

        prismaMock.column.findUnique
          .mockResolvedValueOnce(mockColumnToDelete as any)
          .mockResolvedValueOnce(null);

        const response = await request(app)
          .delete("/api/columns/col-1")
          .query({ moveToColumnId: "non-existent" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid target column");
      });

      it("returns 500 on database error", async () => {
        const mockColumn = {
          ...createMockColumn({ id: "col-1" }),
          todos: [],
        };

        prismaMock.column.findUnique.mockResolvedValue(mockColumn as any);
        prismaMock.column.delete.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).delete("/api/columns/col-1");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PATCH /api/columns/reorder - Reorder columns
  // ===========================================
  describe("PATCH /api/columns/reorder", () => {
    describe("happy path", () => {
      it("returns 200 with reordered columns", async () => {
        const columns = [
          createMockColumn({ id: "col-1", boardId: "board-1" }),
          createMockColumn({ id: "col-2", boardId: "board-1" }),
          createMockColumn({ id: "col-3", boardId: "board-1" }),
        ];

        prismaMock.column.findMany
          .mockResolvedValueOnce(columns as any) // Verification query
          .mockResolvedValueOnce(columns as any); // Final fetch
        prismaMock.$transaction.mockResolvedValue([]);

        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [
              { id: "col-1", position: 2 },
              { id: "col-2", position: 0 },
              { id: "col-3", position: 1 },
            ],
          });

        expect(response.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });

      it("includes todos in response", async () => {
        const columns = [
          {
            ...createMockColumn({ id: "col-1", boardId: "board-1" }),
            todos: [createMockTodo({ id: "todo-1" })],
          },
        ];

        prismaMock.column.findMany
          .mockResolvedValueOnce([
            createMockColumn({ id: "col-1", boardId: "board-1" }),
          ] as any)
          .mockResolvedValueOnce(columns as any);
        prismaMock.$transaction.mockResolvedValue([]);

        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [{ id: "col-1", position: 0 }],
          });

        expect(response.status).toBe(200);
        expect(response.body[0].todos).toBeDefined();
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when boardId is missing", async () => {
        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            columns: [{ id: "col-1", position: 0 }],
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("handles empty columns array gracefully", async () => {
        // Empty array is valid - no columns to reorder
        prismaMock.column.findMany
          .mockResolvedValueOnce([]) // Verification returns empty (matches)
          .mockResolvedValueOnce([]); // Final fetch returns empty
        prismaMock.$transaction.mockResolvedValue([]);

        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [],
          });

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it("returns 400 when column position is negative", async () => {
        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [{ id: "col-1", position: -1 }],
          });

        expect(response.status).toBe(400);
      });

      it("returns 400 when column ID is not in board", async () => {
        prismaMock.column.findMany.mockResolvedValue([] as any);

        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [
              { id: "col-1", position: 0 },
              { id: "col-2", position: 1 },
            ],
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
          "Invalid column IDs or board mismatch"
        );
      });

      it("returns 400 when some columns belong to different board", async () => {
        prismaMock.column.findMany.mockResolvedValue([
          createMockColumn({ id: "col-1", boardId: "board-1" }),
        ] as any);

        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [
              { id: "col-1", position: 0 },
              { id: "col-2", position: 1 }, // This one doesn't exist in board-1
            ],
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
          "Invalid column IDs or board mismatch"
        );
      });

      it("returns 500 on database error", async () => {
        prismaMock.column.findMany.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .patch("/api/columns/reorder")
          .send({
            boardId: "board-1",
            columns: [{ id: "col-1", position: 0 }],
          });

        expect(response.status).toBe(500);
      });
    });
  });
});
