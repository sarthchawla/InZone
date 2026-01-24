import { describe, it, expect, beforeEach } from "vitest";
import { TemplateService } from "./template.service.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import { createMockTemplate, resetFactories } from "../test/factories.js";

describe("TemplateService", () => {
  let templateService: TemplateService;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    templateService = new TemplateService(prismaMock);
  });

  // ===========================================
  // getTemplates - Tests
  // ===========================================
  describe("getTemplates", () => {
    describe("happy path", () => {
      it("returns all built-in templates", async () => {
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

        const result = await templateService.getTemplates();

        expect(result).toHaveLength(3);
        expect(prismaMock.boardTemplate.findMany).toHaveBeenCalledWith({
          where: { isBuiltIn: true },
          orderBy: { name: "asc" },
        });
      });

      it("returns empty array when no built-in templates exist", async () => {
        prismaMock.boardTemplate.findMany.mockResolvedValue([]);

        const result = await templateService.getTemplates();

        expect(result).toEqual([]);
      });

      it("returns templates sorted by name", async () => {
        const mockTemplates = [
          createMockTemplate({ name: "Alpha Template" }),
          createMockTemplate({ name: "Beta Template" }),
          createMockTemplate({ name: "Gamma Template" }),
        ];

        prismaMock.boardTemplate.findMany.mockResolvedValue(mockTemplates as any);

        const result = await templateService.getTemplates();

        expect(result[0].name).toBe("Alpha Template");
        expect(result[1].name).toBe("Beta Template");
        expect(result[2].name).toBe("Gamma Template");
      });

      it("only returns built-in templates (not custom ones)", async () => {
        // This test verifies the query includes the isBuiltIn filter
        const mockTemplates = [
          createMockTemplate({ id: "kanban-basic", isBuiltIn: true }),
        ];

        prismaMock.boardTemplate.findMany.mockResolvedValue(mockTemplates as any);

        await templateService.getTemplates();

        expect(prismaMock.boardTemplate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { isBuiltIn: true },
          })
        );
      });

      it("returns template with columns data", async () => {
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

        const result = await templateService.getTemplates();

        expect(result[0].columns).toHaveLength(3);
      });
    });

    describe("unhappy path", () => {
      it("throws error on database failure", async () => {
        prismaMock.boardTemplate.findMany.mockRejectedValue(new Error("DB Error"));

        await expect(templateService.getTemplates()).rejects.toThrow("DB Error");
      });

      it("throws error on connection timeout", async () => {
        prismaMock.boardTemplate.findMany.mockRejectedValue(
          new Error("Connection timeout")
        );

        await expect(templateService.getTemplates()).rejects.toThrow(
          "Connection timeout"
        );
      });
    });
  });

  // ===========================================
  // getTemplateById - Tests
  // ===========================================
  describe("getTemplateById", () => {
    describe("happy path", () => {
      it("returns template by ID", async () => {
        const mockTemplate = createMockTemplate({
          id: "kanban-basic",
          name: "Basic Kanban",
          description: "Simple three-column Kanban board",
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const result = await templateService.getTemplateById("kanban-basic");

        expect(result).not.toBeNull();
        expect(result?.id).toBe("kanban-basic");
        expect(result?.name).toBe("Basic Kanban");
        expect(prismaMock.boardTemplate.findUnique).toHaveBeenCalledWith({
          where: { id: "kanban-basic" },
        });
      });

      it("returns template with full columns structure", async () => {
        const mockTemplate = createMockTemplate({
          id: "dev-workflow",
          name: "Development",
          columns: [
            { name: "Backlog" },
            { name: "Todo" },
            { name: "In Progress", wipLimit: 3 },
            { name: "Review" },
            { name: "Done" },
          ] as any,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const result = await templateService.getTemplateById("dev-workflow");

        expect(result?.columns).toHaveLength(5);
      });

      it("returns non-built-in template if it exists", async () => {
        // Note: In production, we might want to restrict this
        const mockTemplate = createMockTemplate({
          id: "custom-template",
          name: "Custom",
          isBuiltIn: false,
        });

        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate as any);

        const result = await templateService.getTemplateById("custom-template");

        expect(result?.isBuiltIn).toBe(false);
      });
    });

    describe("unhappy path", () => {
      it("returns null when template not found", async () => {
        prismaMock.boardTemplate.findUnique.mockResolvedValue(null);

        const result = await templateService.getTemplateById("non-existent");

        expect(result).toBeNull();
      });

      it("returns null for invalid ID format", async () => {
        prismaMock.boardTemplate.findUnique.mockResolvedValue(null);

        const result = await templateService.getTemplateById("");

        expect(result).toBeNull();
      });

      it("throws error on database failure", async () => {
        prismaMock.boardTemplate.findUnique.mockRejectedValue(new Error("DB Error"));

        await expect(
          templateService.getTemplateById("kanban-basic")
        ).rejects.toThrow("DB Error");
      });
    });
  });
});
