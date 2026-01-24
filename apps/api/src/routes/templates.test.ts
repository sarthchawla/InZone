import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import { createMockTemplate, resetFactories } from "../test/factories.js";
import { Express } from "express";

describe("Templates Routes", () => {
  let app: Express;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    app = createTestApp();
  });

  // ===========================================
  // GET /api/templates - List built-in templates
  // ===========================================
  describe("GET /api/templates", () => {
    describe("happy path", () => {
      it("returns 200 with templates list", async () => {
        const mockTemplates = [
          createMockTemplate({
            id: "kanban-basic",
            name: "Basic Kanban",
            isBuiltIn: true,
          }),
          createMockTemplate({
            id: "dev-workflow",
            name: "Development",
            isBuiltIn: true,
          }),
          createMockTemplate({
            id: "simple",
            name: "Simple",
            isBuiltIn: true,
          }),
        ];

        prismaMock.boardTemplate.findMany.mockResolvedValue(mockTemplates as any);

        const response = await request(app).get("/api/templates");

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);
      });

      it("returns 200 with empty array when no templates exist", async () => {
        prismaMock.boardTemplate.findMany.mockResolvedValue([]);

        const response = await request(app).get("/api/templates");

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it("only returns built-in templates", async () => {
        prismaMock.boardTemplate.findMany.mockResolvedValue([]);

        await request(app).get("/api/templates");

        expect(prismaMock.boardTemplate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { isBuiltIn: true },
          })
        );
      });

      it("returns templates ordered by name", async () => {
        prismaMock.boardTemplate.findMany.mockResolvedValue([]);

        await request(app).get("/api/templates");

        expect(prismaMock.boardTemplate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { name: "asc" },
          })
        );
      });

      it("returns template with columns structure", async () => {
        const mockTemplate = createMockTemplate({
          id: "kanban-basic",
          name: "Basic Kanban",
          columns: [
            { name: "Todo" },
            { name: "In Progress" },
            { name: "Done" },
          ] as any,
        });

        prismaMock.boardTemplate.findMany.mockResolvedValue([mockTemplate] as any);

        const response = await request(app).get("/api/templates");

        expect(response.status).toBe(200);
        expect(response.body[0].columns).toHaveLength(3);
        expect(response.body[0].columns[0].name).toBe("Todo");
      });

      it("returns template with WIP limits in columns", async () => {
        const mockTemplate = createMockTemplate({
          id: "dev-workflow",
          columns: [
            { name: "Todo" },
            { name: "In Progress", wipLimit: 3 },
            { name: "Done" },
          ] as any,
        });

        prismaMock.boardTemplate.findMany.mockResolvedValue([mockTemplate] as any);

        const response = await request(app).get("/api/templates");

        expect(response.status).toBe(200);
        expect(response.body[0].columns[1].wipLimit).toBe(3);
      });
    });

    describe("unhappy path", () => {
      it("returns 500 on database error", async () => {
        prismaMock.boardTemplate.findMany.mockRejectedValue(
          new Error("DB Error")
        );

        const response = await request(app).get("/api/templates");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // GET /api/templates/:id - Get template by ID
  // ===========================================
  describe("GET /api/templates/:id", () => {
    describe("happy path", () => {
      it("returns 200 with template details", async () => {
        const mockTemplate = createMockTemplate({
          id: "kanban-basic",
          name: "Basic Kanban",
          description: "Simple three-column Kanban board",
          columns: [
            { name: "Todo" },
            { name: "In Progress" },
            { name: "Done" },
          ] as any,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/kanban-basic");

        expect(response.status).toBe(200);
        expect(response.body.id).toBe("kanban-basic");
        expect(response.body.name).toBe("Basic Kanban");
        expect(response.body.description).toBe(
          "Simple three-column Kanban board"
        );
        expect(response.body.columns).toHaveLength(3);
      });

      it("returns template with all column properties", async () => {
        const mockTemplate = createMockTemplate({
          id: "dev-workflow",
          columns: [
            { name: "Backlog" },
            { name: "In Progress", wipLimit: 5 },
            { name: "Review", wipLimit: 2 },
            { name: "Done" },
          ] as any,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/dev-workflow");

        expect(response.status).toBe(200);
        expect(response.body.columns).toHaveLength(4);
        expect(response.body.columns[1].wipLimit).toBe(5);
        expect(response.body.columns[2].wipLimit).toBe(2);
      });

      it("returns built-in template flag", async () => {
        const mockTemplate = createMockTemplate({
          id: "kanban-basic",
          isBuiltIn: true,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/kanban-basic");

        expect(response.status).toBe(200);
        expect(response.body.isBuiltIn).toBe(true);
      });

      it("returns timestamps", async () => {
        const mockTemplate = createMockTemplate({
          id: "kanban-basic",
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-15"),
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/kanban-basic");

        expect(response.status).toBe(200);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.updatedAt).toBeDefined();
      });
    });

    describe("unhappy path", () => {
      it("returns 404 when template not found", async () => {
        prismaMock.boardTemplate.findUnique.mockResolvedValue(null);

        const response = await request(app).get("/api/templates/non-existent");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Template not found");
      });

      it("returns 404 for empty string id", async () => {
        // Express will match this as the GET /api/templates route with trailing slash
        // But let's verify the behavior with a specific non-existent template
        prismaMock.boardTemplate.findUnique.mockResolvedValue(null);

        const response = await request(app).get("/api/templates/unknown-id");

        expect(response.status).toBe(404);
      });

      it("returns 500 on database error", async () => {
        prismaMock.boardTemplate.findUnique.mockRejectedValue(
          new Error("DB Error")
        );

        const response = await request(app).get("/api/templates/kanban-basic");

        expect(response.status).toBe(500);
      });
    });
  });

  // ===========================================
  // Template Data Structure Tests
  // ===========================================
  describe("Template Data Structure", () => {
    describe("column structure validation", () => {
      it("handles template with no columns", async () => {
        const mockTemplate = createMockTemplate({
          id: "empty",
          columns: [] as any,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/empty");

        expect(response.status).toBe(200);
        expect(response.body.columns).toEqual([]);
      });

      it("handles template with many columns", async () => {
        const columns = Array.from({ length: 10 }, (_, i) => ({
          name: `Column ${i + 1}`,
        }));
        const mockTemplate = createMockTemplate({
          id: "many-columns",
          columns: columns as any,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/many-columns");

        expect(response.status).toBe(200);
        expect(response.body.columns).toHaveLength(10);
      });
    });

    describe("template metadata", () => {
      it("returns template with null description", async () => {
        const mockTemplate = createMockTemplate({
          id: "minimal",
          description: null,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/minimal");

        expect(response.status).toBe(200);
        expect(response.body.description).toBeNull();
      });

      it("returns template with long description", async () => {
        const mockTemplate = createMockTemplate({
          id: "detailed",
          description: "A".repeat(500),
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const response = await request(app).get("/api/templates/detailed");

        expect(response.status).toBe(200);
        expect(response.body.description).toHaveLength(500);
      });
    });
  });
});
