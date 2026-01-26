import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import {
  createMockBoard,
  createMockColumn,
  createMockTodo,
  createMockLabel,
  createMockTemplate,
  resetFactories,
} from "../test/factories.js";
import { Express } from "express";

describe("Boards Routes", () => {
  let app: Express;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    app = createTestApp();
  });

  // ===========================================
  // GET /api/boards - List all boards
  // ===========================================
  describe("GET /api/boards", () => {
    describe("happy path", () => {
      it("returns 200 with boards list", async () => {
        const mockBoards = [
          {
            ...createMockBoard({ id: "board-1", name: "Work" }),
            columns: [
              {
                ...createMockColumn({ id: "col-1", name: "Todo" }),
                _count: { todos: 3 },
              },
            ],
          },
          {
            ...createMockBoard({ id: "board-2", name: "Personal" }),
            columns: [
              {
                ...createMockColumn({ id: "col-2", name: "Done" }),
                _count: { todos: 2 },
              },
            ],
          },
        ];

        prismaMock.board.findMany.mockResolvedValue(mockBoards as any);

        const response = await request(app).get("/api/boards");

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].todoCount).toBe(3);
        expect(response.body[1].todoCount).toBe(2);
      });

      it("returns 200 with empty array when no boards exist", async () => {
        prismaMock.board.findMany.mockResolvedValue([]);

        const response = await request(app).get("/api/boards");

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it("returns boards ordered by position", async () => {
        const mockBoards = [
          {
            ...createMockBoard({ id: "board-1", position: 0 }),
            columns: [],
          },
          {
            ...createMockBoard({ id: "board-2", position: 1 }),
            columns: [],
          },
        ];

        prismaMock.board.findMany.mockResolvedValue(mockBoards as any);

        const response = await request(app).get("/api/boards");

        expect(response.status).toBe(200);
        expect(prismaMock.board.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { position: "asc" },
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns 500 on database error", async () => {
        prismaMock.board.findMany.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).get("/api/boards");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // POST /api/boards - Create board
  // ===========================================
  describe("POST /api/boards", () => {
    describe("happy path", () => {
      it("returns 201 when board created successfully", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "New Board" }),
          columns: [],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .post("/api/boards")
          .send({ name: "New Board", description: "A new board" });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("New Board");
      });

      it("creates board with columns from template", async () => {
        const mockTemplate = createMockTemplate({
          id: "kanban-basic",
          columns: [
            { name: "Todo" },
            { name: "In Progress" },
            { name: "Done" },
          ] as any,
        });

        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "Sprint Board" }),
          columns: [
            createMockColumn({ name: "Todo", position: 0 }),
            createMockColumn({ name: "In Progress", position: 1 }),
            createMockColumn({ name: "Done", position: 2 }),
          ],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .post("/api/boards")
          .send({ name: "Sprint Board", templateId: "kanban-basic" });

        expect(response.status).toBe(201);
        expect(response.body.columns).toHaveLength(3);
      });

      it("creates board with correct position when other boards exist", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", position: 3 }),
          columns: [],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .post("/api/boards")
          .send({ name: "New Board" });

        expect(response.status).toBe(201);
        expect(prismaMock.board.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              position: 3,
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when name is missing", async () => {
        const response = await request(app)
          .post("/api/boards")
          .send({ description: "No name provided" });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when name is empty", async () => {
        const response = await request(app)
          .post("/api/boards")
          .send({ name: "" });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when name exceeds max length", async () => {
        const response = await request(app)
          .post("/api/boards")
          .send({ name: "A".repeat(101) });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when description exceeds max length", async () => {
        const response = await request(app)
          .post("/api/boards")
          .send({ name: "Valid Name", description: "D".repeat(501) });

        expect(response.status).toBe(400);
      });

      it("ignores non-existent template gracefully", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1" }),
          columns: [],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.boardTemplate.findUnique.mockResolvedValue(null);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .post("/api/boards")
          .send({ name: "New Board", templateId: "non-existent" });

        expect(response.status).toBe(201);
        expect(response.body.columns).toEqual([]);
      });

      it("returns 500 on database error", async () => {
        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.board.create.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .post("/api/boards")
          .send({ name: "New Board" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // GET /api/boards/:id - Get board by ID
  // ===========================================
  describe("GET /api/boards/:id", () => {
    describe("happy path", () => {
      it("returns 200 with board details", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "My Board" }),
          columns: [
            {
              ...createMockColumn({ id: "col-1", name: "Todo" }),
              todos: [
                {
                  ...createMockTodo({ id: "todo-1", title: "Task 1" }),
                  labels: [createMockLabel({ id: "label-1", name: "Bug" })],
                },
              ],
            },
          ],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);

        const response = await request(app).get("/api/boards/board-1");

        expect(response.status).toBe(200);
        expect(response.body.id).toBe("board-1");
        expect(response.body.name).toBe("My Board");
        expect(response.body.columns).toHaveLength(1);
        expect(response.body.columns[0].todos).toHaveLength(1);
      });

      it("returns board with empty columns", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1" }),
          columns: [],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);

        const response = await request(app).get("/api/boards/board-1");

        expect(response.status).toBe(200);
        expect(response.body.columns).toEqual([]);
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when board not found", async () => {
        prismaMock.board.findUnique.mockResolvedValue(null);

        const response = await request(app).get("/api/boards/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Board not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.board.findUnique.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).get("/api/boards/board-1");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PUT /api/boards/:id - Update board
  // ===========================================
  describe("PUT /api/boards/:id", () => {
    describe("happy path", () => {
      it("returns 200 with updated board", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "Updated Name" }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ name: "Updated Name" });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("Updated Name");
      });

      it("updates board description", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", description: "New Description" }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ description: "New Description" });

        expect(response.status).toBe(200);
        expect(response.body.description).toBe("New Description");
      });

      it("updates board position", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", position: 5 }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ position: 5 });

        expect(response.status).toBe(200);
        expect(response.body.position).toBe(5);
      });

      it("clears description when set to null", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", description: null }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ description: null });

        expect(response.status).toBe(200);
        expect(response.body.description).toBeNull();
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when name is empty", async () => {
        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ name: "" });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when name exceeds max length", async () => {
        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ name: "A".repeat(101) });

        expect(response.status).toBe(400);
      });

      it("returns 400 when position is negative", async () => {
        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ position: -1 });

        expect(response.status).toBe(400);
      });

      it("returns 404 when board not found", async () => {
        const error: any = new Error("Record not found");
        error.code = "P2025";
        prismaMock.board.update.mockRejectedValue(error);

        const response = await request(app)
          .put("/api/boards/non-existent")
          .send({ name: "Updated" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Board not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.board.update.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .put("/api/boards/board-1")
          .send({ name: "Updated" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // DELETE /api/boards/:id - Delete board
  // ===========================================
  describe("DELETE /api/boards/:id", () => {
    describe("happy path", () => {
      it("returns 204 when board deleted successfully", async () => {
        prismaMock.board.delete.mockResolvedValue(
          createMockBoard({ id: "board-1" }) as any
        );

        const response = await request(app).delete("/api/boards/board-1");

        expect(response.status).toBe(204);
        expect(prismaMock.board.delete).toHaveBeenCalledWith({
          where: { id: "board-1" },
        });
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when board not found", async () => {
        const error: any = new Error("Record not found");
        error.code = "P2025";
        prismaMock.board.delete.mockRejectedValue(error);

        const response = await request(app).delete("/api/boards/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Board not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.board.delete.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).delete("/api/boards/board-1");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // POST /api/boards/:id/duplicate - Duplicate board
  // ===========================================
  describe("POST /api/boards/:id/duplicate", () => {
    describe("happy path", () => {
      it("returns 201 with duplicated board", async () => {
        const mockSourceBoard = {
          ...createMockBoard({ id: "board-1", name: "Original" }),
          columns: [
            {
              ...createMockColumn({ id: "col-1", name: "Todo" }),
              todos: [
                {
                  ...createMockTodo({ id: "todo-1", title: "Task 1" }),
                  labels: [createMockLabel({ id: "label-1" })],
                },
              ],
            },
          ],
        };

        const mockDuplicatedBoard = {
          ...createMockBoard({ id: "board-2", name: "Original (Copy)" }),
          columns: [
            {
              ...createMockColumn({ id: "col-2", name: "Todo" }),
              todos: [
                {
                  ...createMockTodo({ id: "todo-2", title: "Task 1" }),
                  labels: [createMockLabel({ id: "label-1" })],
                },
              ],
            },
          ],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockSourceBoard as any);
        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: 0 },
        } as any);
        prismaMock.board.create.mockResolvedValue(mockDuplicatedBoard as any);

        const response = await request(app).post("/api/boards/board-1/duplicate");

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Original (Copy)");
      });

      it("duplicates empty board", async () => {
        const mockSourceBoard = {
          ...createMockBoard({ id: "board-1", name: "Empty" }),
          columns: [],
        };

        const mockDuplicatedBoard = {
          ...createMockBoard({ id: "board-2", name: "Empty (Copy)" }),
          columns: [],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockSourceBoard as any);
        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.board.create.mockResolvedValue(mockDuplicatedBoard as any);

        const response = await request(app).post("/api/boards/board-1/duplicate");

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Empty (Copy)");
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when source board not found", async () => {
        prismaMock.board.findUnique.mockResolvedValue(null);

        const response = await request(app).post(
          "/api/boards/non-existent/duplicate"
        );

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Board not found");
      });

      it("returns 500 on database error", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1" }),
          columns: [],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.board.create.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).post("/api/boards/board-1/duplicate");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // POST /api/boards/:boardId/columns - Add column to board
  // ===========================================
  describe("POST /api/boards/:boardId/columns", () => {
    describe("happy path", () => {
      it("returns 201 when column added successfully", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });
        const mockColumn = createMockColumn({
          id: "col-1",
          name: "New Column",
          boardId: "board-1",
        });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.column.create.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "New Column" });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("New Column");
      });

      it("creates column with WIP limit", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });
        const mockColumn = createMockColumn({
          id: "col-1",
          name: "In Progress",
          wipLimit: 5,
          boardId: "board-1",
        });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.column.create.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "In Progress", wipLimit: 5 });

        expect(response.status).toBe(201);
        expect(response.body.wipLimit).toBe(5);
      });

      it("creates column with correct position", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });
        const mockColumn = createMockColumn({
          id: "col-1",
          position: 3,
        });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.column.create.mockResolvedValue(mockColumn as any);

        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "New Column" });

        expect(response.status).toBe(201);
        expect(prismaMock.column.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              position: 3,
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when name is missing", async () => {
        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when name is empty", async () => {
        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when name exceeds max length", async () => {
        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "A".repeat(101) });

        expect(response.status).toBe(400);
      });

      it("returns 400 when WIP limit is zero", async () => {
        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "Column", wipLimit: 0 });

        expect(response.status).toBe(400);
      });

      it("returns 400 when WIP limit is negative", async () => {
        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "Column", wipLimit: -1 });

        expect(response.status).toBe(400);
      });

      it("returns 404 when board not found", async () => {
        prismaMock.board.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .post("/api/boards/non-existent/columns")
          .send({ name: "New Column" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Board not found");
      });

      it("returns 500 on database error", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.column.create.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .post("/api/boards/board-1/columns")
          .send({ name: "New Column" });

        expect(response.status).toBe(500);
      });
    });
  });
});
