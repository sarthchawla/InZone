import { describe, it, expect, beforeEach } from "vitest";
import { LabelService } from "./label.service.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import { createMockLabel, resetFactories } from "../test/factories.js";

describe("LabelService", () => {
  let labelService: LabelService;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    labelService = new LabelService(prismaMock);
  });

  // ===========================================
  // getLabels - Tests
  // ===========================================
  describe("getLabels", () => {
    describe("happy path", () => {
      it("returns all labels with todo counts", async () => {
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

        const result = await labelService.getLabels();

        expect(result).toHaveLength(2);
        expect(result[0]._count.todos).toBe(5);
        expect(prismaMock.label.findMany).toHaveBeenCalledWith({
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { todos: true },
            },
          },
        });
      });

      it("returns empty array when no labels exist", async () => {
        prismaMock.label.findMany.mockResolvedValue([]);

        const result = await labelService.getLabels();

        expect(result).toEqual([]);
      });

      it("returns labels sorted alphabetically", async () => {
        const mockLabels = [
          { ...createMockLabel({ name: "Alpha" }), _count: { todos: 0 } },
          { ...createMockLabel({ name: "Beta" }), _count: { todos: 0 } },
          { ...createMockLabel({ name: "Gamma" }), _count: { todos: 0 } },
        ];

        prismaMock.label.findMany.mockResolvedValue(mockLabels as any);

        const result = await labelService.getLabels();

        expect(result[0].name).toBe("Alpha");
        expect(result[1].name).toBe("Beta");
        expect(result[2].name).toBe("Gamma");
      });
    });

    describe("unhappy path", () => {
      it("throws error on database failure", async () => {
        prismaMock.label.findMany.mockRejectedValue(new Error("DB Error"));

        await expect(labelService.getLabels()).rejects.toThrow("DB Error");
      });
    });
  });

  // ===========================================
  // getLabelById - Tests
  // ===========================================
  describe("getLabelById", () => {
    describe("happy path", () => {
      it("returns label with todo count", async () => {
        const mockLabel = {
          ...createMockLabel({ id: "label-1", name: "Bug", color: "#FF0000" }),
          _count: { todos: 10 },
        };

        prismaMock.label.findUnique.mockResolvedValue(mockLabel as any);

        const result = await labelService.getLabelById("label-1");

        expect(result).not.toBeNull();
        expect(result?.name).toBe("Bug");
        expect(result?.color).toBe("#FF0000");
        expect(result?._count.todos).toBe(10);
      });

      it("returns label with zero todos", async () => {
        const mockLabel = {
          ...createMockLabel({ id: "label-1" }),
          _count: { todos: 0 },
        };

        prismaMock.label.findUnique.mockResolvedValue(mockLabel as any);

        const result = await labelService.getLabelById("label-1");

        expect(result?._count.todos).toBe(0);
      });
    });

    describe("unhappy path", () => {
      it("returns null when label not found", async () => {
        prismaMock.label.findUnique.mockResolvedValue(null);

        const result = await labelService.getLabelById("non-existent");

        expect(result).toBeNull();
      });

      it("throws error on database failure", async () => {
        prismaMock.label.findUnique.mockRejectedValue(new Error("DB Error"));

        await expect(labelService.getLabelById("label-1")).rejects.toThrow(
          "DB Error"
        );
      });
    });
  });

  // ===========================================
  // createLabel - Tests
  // ===========================================
  describe("createLabel", () => {
    describe("happy path", () => {
      it("creates label with name and color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "Urgent",
          color: "#FF0000",
        });

        prismaMock.label.create.mockResolvedValue(mockLabel as any);

        const result = await labelService.createLabel({
          name: "Urgent",
          color: "#FF0000",
        });

        expect(result.name).toBe("Urgent");
        expect(result.color).toBe("#FF0000");
        expect(prismaMock.label.create).toHaveBeenCalledWith({
          data: {
            name: "Urgent",
            color: "#FF0000",
          },
        });
      });

      it("creates label with lowercase hex color", async () => {
        const mockLabel = createMockLabel({
          name: "Test",
          color: "#abc123",
        });

        prismaMock.label.create.mockResolvedValue(mockLabel as any);

        const result = await labelService.createLabel({
          name: "Test",
          color: "#abc123",
        });

        expect(result.color).toBe("#abc123");
      });

      it("creates label with uppercase hex color", async () => {
        const mockLabel = createMockLabel({
          name: "Test",
          color: "#ABC123",
        });

        prismaMock.label.create.mockResolvedValue(mockLabel as any);

        const result = await labelService.createLabel({
          name: "Test",
          color: "#ABC123",
        });

        expect(result.color).toBe("#ABC123");
      });
    });

    describe("unhappy path", () => {
      it("throws error on duplicate name (if unique constraint)", async () => {
        prismaMock.label.create.mockRejectedValue(
          new Error("Unique constraint violation")
        );

        await expect(
          labelService.createLabel({ name: "Existing", color: "#000000" })
        ).rejects.toThrow("Unique constraint violation");
      });

      it("throws error on database failure", async () => {
        prismaMock.label.create.mockRejectedValue(new Error("DB Error"));

        await expect(
          labelService.createLabel({ name: "Test", color: "#000000" })
        ).rejects.toThrow("DB Error");
      });
    });
  });

  // ===========================================
  // updateLabel - Tests
  // ===========================================
  describe("updateLabel", () => {
    describe("happy path", () => {
      it("updates label name", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "Updated Name",
        });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        const result = await labelService.updateLabel("label-1", {
          name: "Updated Name",
        });

        expect(result.name).toBe("Updated Name");
        expect(prismaMock.label.update).toHaveBeenCalledWith({
          where: { id: "label-1" },
          data: { name: "Updated Name" },
        });
      });

      it("updates label color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          color: "#00FF00",
        });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        const result = await labelService.updateLabel("label-1", {
          color: "#00FF00",
        });

        expect(result.color).toBe("#00FF00");
      });

      it("updates both name and color", async () => {
        const mockLabel = createMockLabel({
          id: "label-1",
          name: "New Name",
          color: "#0000FF",
        });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        await labelService.updateLabel("label-1", {
          name: "New Name",
          color: "#0000FF",
        });

        expect(prismaMock.label.update).toHaveBeenCalledWith({
          where: { id: "label-1" },
          data: {
            name: "New Name",
            color: "#0000FF",
          },
        });
      });

      it("updates with empty data object", async () => {
        const mockLabel = createMockLabel({ id: "label-1" });

        prismaMock.label.update.mockResolvedValue(mockLabel as any);

        await labelService.updateLabel("label-1", {});

        expect(prismaMock.label.update).toHaveBeenCalledWith({
          where: { id: "label-1" },
          data: {},
        });
      });
    });

    describe("unhappy path", () => {
      it("throws error when label not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.label.update.mockRejectedValue(error);

        await expect(
          labelService.updateLabel("non-existent", { name: "Test" })
        ).rejects.toThrow("Record not found");
      });

      it("throws error on database failure", async () => {
        prismaMock.label.update.mockRejectedValue(new Error("DB Error"));

        await expect(
          labelService.updateLabel("label-1", { name: "Test" })
        ).rejects.toThrow("DB Error");
      });
    });
  });

  // ===========================================
  // deleteLabel - Tests
  // ===========================================
  describe("deleteLabel", () => {
    describe("happy path", () => {
      it("deletes label successfully", async () => {
        prismaMock.label.delete.mockResolvedValue(
          createMockLabel({ id: "label-1" }) as any
        );

        await labelService.deleteLabel("label-1");

        expect(prismaMock.label.delete).toHaveBeenCalledWith({
          where: { id: "label-1" },
        });
      });

      it("deletes label and removes from todos (via Prisma cascade)", async () => {
        prismaMock.label.delete.mockResolvedValue(
          createMockLabel({ id: "label-1" }) as any
        );

        await labelService.deleteLabel("label-1");

        // The deletion itself is enough - Prisma handles the many-to-many relation
        expect(prismaMock.label.delete).toHaveBeenCalled();
      });
    });

    describe("unhappy path", () => {
      it("throws error when label not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.label.delete.mockRejectedValue(error);

        await expect(labelService.deleteLabel("non-existent")).rejects.toThrow(
          "Record not found"
        );
      });

      it("throws error on database failure", async () => {
        prismaMock.label.delete.mockRejectedValue(new Error("DB Error"));

        await expect(labelService.deleteLabel("label-1")).rejects.toThrow(
          "DB Error"
        );
      });
    });
  });
});
