import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import { createMockLabel, resetFactories } from "../test/factories.js";
import { Express } from "express";

describe("Labels Routes", () => {
  let app: Express;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    app = createTestApp();
  });

  // ===========================================
  // GET /api/labels - List labels
  // ===========================================
  describe("GET /api/labels", () => {
    describe("happy path", () => {
      it("returns 200 with labels list", async () => {
        const mockLabels = [
          {
            ...createMockLabel({ id: "label-1", name: "Bug" }),
            _count: { todos: 5 },
          },
          {
            ...createMockLabel({ id: "label-2", name: "Feature" }),
            _count: { todos: 3 },
          },
        ];

        prismaMock.label.findMany.mockResolvedValue(mockLabels as any);

        const response = await request(app).get("/api/labels");

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0]._count.todos).toBe(5);
      });

      it("returns 200 with empty array when no labels exist", async () => {
        prismaMock.label.findMany.mockResolvedValue([]);

        const response = await request(app).get("/api/labels");

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it("returns labels ordered by name", async () => {
        const mockLabels = [
          {
            ...createMockLabel({ id: "label-1", name: "Bug" }),
            _count: { todos: 0 },
          },
          {
            ...createMockLabel({ id: "label-2", name: "Feature" }),
            _count: { todos: 0 },
          },
        ];

        prismaMock.label.findMany.mockResolvedValue(mockLabels as any);

        const response = await request(app).get("/api/labels");

        expect(response.status).toBe(200);
        expect(prismaMock.label.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { name: "asc" },
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns 500 on database error", async () => {
        prismaMock.label.findMany.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).get("/api/labels");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // POST /api/labels - Create label
  // ===========================================
  describe("POST /api/labels", () => {
    describe("happy path", () => {
      it("returns 201 when label created successfully", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "Bug",
          color: "#FF0000",
        });

        prismaMock.label.create.mockResolvedValue(mockLabel as any);

        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug", color: "#FF0000" });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Bug");
        expect(response.body.color).toBe("#FF0000");
      });

      it("creates label with lowercase hex color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "Feature",
          color: "#aabbcc",
        });

        prismaMock.label.create.mockResolvedValue(mockLabel as any);

        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Feature", color: "#aabbcc" });

        expect(response.status).toBe(201);
        expect(response.body.color).toBe("#aabbcc");
      });

      it("creates label with mixed case hex color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "Urgent",
          color: "#AaBbCc",
        });

        prismaMock.label.create.mockResolvedValue(mockLabel as any);

        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Urgent", color: "#AaBbCc" });

        expect(response.status).toBe(201);
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when name is missing", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ color: "#FF0000" });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it("returns 400 when name is empty", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "", color: "#FF0000" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when name exceeds max length", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "A".repeat(51), color: "#FF0000" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is missing", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is invalid format - missing hash", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug", color: "FF0000" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is invalid format - wrong length", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug", color: "#FFF" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is invalid format - invalid characters", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug", color: "#GGGGGG" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is a named color", async () => {
        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug", color: "red" });

        expect(response.status).toBe(400);
      });

      it("returns 500 on database error", async () => {
        prismaMock.label.create.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .post("/api/labels")
          .send({ name: "Bug", color: "#FF0000" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // GET /api/labels/:id - Get label by ID
  // ===========================================
  describe("GET /api/labels/:id", () => {
    describe("happy path", () => {
      it("returns 200 with label details", async () => {
        const mockLabel = {
          ...createMockLabel({ id: "label-1", name: "Bug", color: "#FF0000" }),
          _count: { todos: 10 },
        };

        prismaMock.label.findUnique.mockResolvedValue(mockLabel as any);

        const response = await request(app).get("/api/labels/label-1");

        expect(response.status).toBe(200);
        expect(response.body.id).toBe("label-1");
        expect(response.body.name).toBe("Bug");
        expect(response.body._count.todos).toBe(10);
      });

      it("returns label with zero todos", async () => {
        const mockLabel = {
          ...createMockLabel({ id: "label-1" }),
          _count: { todos: 0 },
        };

        prismaMock.label.findUnique.mockResolvedValue(mockLabel as any);

        const response = await request(app).get("/api/labels/label-1");

        expect(response.status).toBe(200);
        expect(response.body._count.todos).toBe(0);
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when label not found", async () => {
        prismaMock.label.findUnique.mockResolvedValue(null);

        const response = await request(app).get("/api/labels/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Label not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.label.findUnique.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).get("/api/labels/label-1");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // PUT /api/labels/:id - Update label
  // ===========================================
  describe("PUT /api/labels/:id", () => {
    describe("happy path", () => {
      it("returns 200 with updated label", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "Updated Name",
        });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ name: "Updated Name" });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("Updated Name");
      });

      it("updates label color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          color: "#00FF00",
        });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ color: "#00FF00" });

        expect(response.status).toBe(200);
        expect(response.body.color).toBe("#00FF00");
      });

      it("updates both name and color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "New Name",
          color: "#0000FF",
        });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ name: "New Name", color: "#0000FF" });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("New Name");
        expect(response.body.color).toBe("#0000FF");
      });
    });

    describe("unhappy path", () => {
      it("returns 400 when name is empty", async () => {
        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ name: "" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when name exceeds max length", async () => {
        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ name: "A".repeat(51) });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is invalid format", async () => {
        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ color: "invalid" });

        expect(response.status).toBe(400);
      });

      it("returns 400 when color is missing hash", async () => {
        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ color: "FF0000" });

        expect(response.status).toBe(400);
      });

      it("returns 404 when label not found", async () => {
        const error: any = new Error("Record not found");
        error.code = "P2025";
        prismaMock.label.update.mockRejectedValue(error);

        const response = await request(app)
          .put("/api/labels/non-existent")
          .send({ name: "Updated" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Label not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.label.update.mockRejectedValue(new Error("DB Error"));

        const response = await request(app)
          .put("/api/labels/label-1")
          .send({ name: "Updated" });

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // DELETE /api/labels/:id - Delete label
  // ===========================================
  describe("DELETE /api/labels/:id", () => {
    describe("happy path", () => {
      it("returns 204 when label deleted successfully", async () => {
        prismaMock.label.delete.mockResolvedValue(
          createMockLabel({ id: "label-1" }) as any
        );

        const response = await request(app).delete("/api/labels/label-1");

        expect(response.status).toBe(204);
        expect(prismaMock.label.delete).toHaveBeenCalledWith({
          where: { id: "label-1" },
        });
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when label not found", async () => {
        const error: any = new Error("Record not found");
        error.code = "P2025";
        prismaMock.label.delete.mockRejectedValue(error);

        const response = await request(app).delete("/api/labels/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Label not found");
      });

      it("returns 500 on database error", async () => {
        prismaMock.label.delete.mockRejectedValue(new Error("DB Error"));

        const response = await request(app).delete("/api/labels/label-1");

        expect(response.status).toBe(500);
      });
    });
  });
});
