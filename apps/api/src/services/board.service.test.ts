import { describe, it, expect, beforeEach, vi } from "vitest";
import { BoardService } from "./board.service.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import {
  createMockBoard,
  createMockColumn,
  createMockTodo,
  createMockLabel,
  createMockTemplate,
  resetFactories,
} from "../test/factories.js";
import { Priority } from "@prisma/client";

describe("BoardService", () => {
  let boardService: BoardService;

  beforeEach(() => {
    resetPrismaMock();
    resetFactories();
    boardService = new BoardService(prismaMock);
  });

  // ===========================================
  // getBoards - Happy Path Tests
  // ===========================================
  describe("getBoards", () => {
    describe("happy path", () => {
      it("returns all boards with columns and todo counts", async () => {
        const mockBoards = [
          {
            ...createMockBoard({ id: "board-1", name: "Work", position: 0 }),
            columns: [
              {
                ...createMockColumn({ id: "col-1", name: "Todo" }),
                _count: { todos: 3 },
              },
              {
                ...createMockColumn({ id: "col-2", name: "Done" }),
                _count: { todos: 2 },
              },
            ],
          },
          {
            ...createMockBoard({ id: "board-2", name: "Personal", position: 1 }),
            columns: [
              {
                ...createMockColumn({ id: "col-3", name: "Todo" }),
                _count: { todos: 5 },
              },
            ],
          },
        ];

        prismaMock.board.findMany.mockResolvedValue(mockBoards as any);

        const result = await boardService.getBoards();

        expect(result).toHaveLength(2);
        expect(result[0].todoCount).toBe(5); // 3 + 2
        expect(result[1].todoCount).toBe(5);
        expect(prismaMock.board.findMany).toHaveBeenCalledWith({
          orderBy: { position: "asc" },
          include: {
            columns: {
              orderBy: { position: "asc" },
              include: {
                _count: {
                  select: { todos: { where: { archived: false } } },
                },
              },
            },
          },
        });
      });

      it("returns empty array when no boards exist", async () => {
        prismaMock.board.findMany.mockResolvedValue([]);

        const result = await boardService.getBoards();

        expect(result).toEqual([]);
      });

      it("handles boards with no columns", async () => {
        const mockBoards = [
          {
            ...createMockBoard({ id: "board-1" }),
            columns: [],
          },
        ];

        prismaMock.board.findMany.mockResolvedValue(mockBoards as any);

        const result = await boardService.getBoards();

        expect(result[0].todoCount).toBe(0);
      });
    });

    describe("unhappy path", () => {
      it("throws error when database connection fails", async () => {
        prismaMock.board.findMany.mockRejectedValue(
          new Error("Connection refused")
        );

        await expect(boardService.getBoards()).rejects.toThrow(
          "Connection refused"
        );
      });
    });
  });

  // ===========================================
  // getBoardById - Happy Path Tests
  // ===========================================
  describe("getBoardById", () => {
    describe("happy path", () => {
      it("returns board with columns and todos", async () => {
        const mockLabel = createMockLabel({ id: "label-1", name: "Bug" });
        const mockTodo = {
          ...createMockTodo({ id: "todo-1", title: "Fix bug" }),
          labels: [mockLabel],
        };
        const mockColumn = {
          ...createMockColumn({ id: "col-1", name: "Todo" }),
          todos: [mockTodo],
        };
        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "Work" }),
          columns: [mockColumn],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);

        const result = await boardService.getBoardById("board-1");

        expect(result).not.toBeNull();
        expect(result?.name).toBe("Work");
        expect(result?.columns).toHaveLength(1);
        expect(result?.columns[0].todos).toHaveLength(1);
        expect(result?.columns[0].todos[0].labels).toHaveLength(1);
      });

      it("returns board with empty columns", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1" }),
          columns: [],
        };

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);

        const result = await boardService.getBoardById("board-1");

        expect(result?.columns).toEqual([]);
      });
    });

    describe("unhappy path", () => {
      it("returns null when board not found", async () => {
        prismaMock.board.findUnique.mockResolvedValue(null);

        const result = await boardService.getBoardById("non-existent");

        expect(result).toBeNull();
      });

      it("throws error on database error", async () => {
        prismaMock.board.findUnique.mockRejectedValue(new Error("DB Error"));

        await expect(boardService.getBoardById("board-1")).rejects.toThrow(
          "DB Error"
        );
      });
    });
  });

  // ===========================================
  // createBoard - Happy Path Tests
  // ===========================================
  describe("createBoard", () => {
    describe("happy path", () => {
      it("creates board without template", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "New Board" }),
          columns: [],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        const result = await boardService.createBoard({
          name: "New Board",
          description: "Test description",
        });

        expect(result.name).toBe("New Board");
        expect(result.columns).toEqual([]);
        expect(prismaMock.board.create).toHaveBeenCalledWith({
          data: {
            name: "New Board",
            description: "Test description",
            templateId: undefined,
            position: 0,
            columns: {
              create: [],
            },
          },
          include: {
            columns: {
              orderBy: { position: "asc" },
            },
          },
        });
      });

      it("creates board from template with columns", async () => {
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
            createMockColumn({ id: "col-1", name: "Todo", position: 0 }),
            createMockColumn({ id: "col-2", name: "In Progress", position: 1 }),
            createMockColumn({ id: "col-3", name: "Done", position: 2 }),
          ],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        const result = await boardService.createBoard({
          name: "Sprint Board",
          templateId: "kanban-basic",
        });

        expect(result.columns).toHaveLength(3);
        expect(prismaMock.board.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              position: 3,
              columns: {
                create: [
                  { name: "Todo", position: 0, wipLimit: undefined },
                  { name: "In Progress", position: 1, wipLimit: undefined },
                  { name: "Done", position: 2, wipLimit: undefined },
                ],
              },
            }),
          })
        );
      });

      it("creates board with correct position when other boards exist", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", position: 5 }),
          columns: [],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: 4 },
        } as any);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        await boardService.createBoard({ name: "New Board" });

        expect(prismaMock.board.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              position: 5,
            }),
          })
        );
      });

      it("creates board from template with WIP limits", async () => {
        const mockTemplate = createMockTemplate({
          id: "dev-workflow",
          columns: [
            { name: "Todo" },
            { name: "In Progress", wipLimit: 3 },
            { name: "Done" },
          ] as any,
        });

        const mockBoard = {
          ...createMockBoard({ id: "board-1" }),
          columns: [],
        };

        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.boardTemplate.findUnique.mockResolvedValue(mockTemplate);
        prismaMock.board.create.mockResolvedValue(mockBoard as any);

        await boardService.createBoard({
          name: "Dev Board",
          templateId: "dev-workflow",
        });

        expect(prismaMock.board.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              columns: {
                create: expect.arrayContaining([
                  expect.objectContaining({ name: "In Progress", wipLimit: 3 }),
                ]),
              },
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("throws error when template not found", async () => {
        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.boardTemplate.findUnique.mockResolvedValue(null);

        await expect(
          boardService.createBoard({
            name: "New Board",
            templateId: "non-existent",
          })
        ).rejects.toThrow("Template not found");
      });

      it("throws error on database error during creation", async () => {
        prismaMock.board.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.board.create.mockRejectedValue(
          new Error("Unique constraint violation")
        );

        await expect(
          boardService.createBoard({ name: "New Board" })
        ).rejects.toThrow("Unique constraint violation");
      });
    });
  });

  // ===========================================
  // updateBoard - Happy Path Tests
  // ===========================================
  describe("updateBoard", () => {
    describe("happy path", () => {
      it("updates board name", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", name: "Updated Name" }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const result = await boardService.updateBoard("board-1", {
          name: "Updated Name",
        });

        expect(result.name).toBe("Updated Name");
        expect(prismaMock.board.update).toHaveBeenCalledWith({
          where: { id: "board-1" },
          data: { name: "Updated Name" },
          include: {
            columns: {
              orderBy: { position: "asc" },
            },
          },
        });
      });

      it("updates board description to null", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", description: null }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const result = await boardService.updateBoard("board-1", {
          description: null,
        });

        expect(result.description).toBeNull();
      });

      it("updates board position", async () => {
        const mockBoard = {
          ...createMockBoard({ id: "board-1", position: 5 }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        const result = await boardService.updateBoard("board-1", {
          position: 5,
        });

        expect(result.position).toBe(5);
      });

      it("updates multiple fields at once", async () => {
        const mockBoard = {
          ...createMockBoard({
            id: "board-1",
            name: "New Name",
            description: "New Desc",
            position: 2,
          }),
          columns: [],
        };

        prismaMock.board.update.mockResolvedValue(mockBoard as any);

        await boardService.updateBoard("board-1", {
          name: "New Name",
          description: "New Desc",
          position: 2,
        });

        expect(prismaMock.board.update).toHaveBeenCalledWith({
          where: { id: "board-1" },
          data: {
            name: "New Name",
            description: "New Desc",
            position: 2,
          },
          include: {
            columns: {
              orderBy: { position: "asc" },
            },
          },
        });
      });
    });

    describe("unhappy path", () => {
      it("throws error when board not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.board.update.mockRejectedValue(error);

        await expect(
          boardService.updateBoard("non-existent", { name: "Test" })
        ).rejects.toThrow("Record not found");
      });

      it("throws error on database error", async () => {
        prismaMock.board.update.mockRejectedValue(new Error("DB Error"));

        await expect(
          boardService.updateBoard("board-1", { name: "Test" })
        ).rejects.toThrow("DB Error");
      });
    });
  });

  // ===========================================
  // deleteBoard - Happy Path Tests
  // ===========================================
  describe("deleteBoard", () => {
    describe("happy path", () => {
      it("deletes board successfully", async () => {
        prismaMock.board.delete.mockResolvedValue(
          createMockBoard({ id: "board-1" }) as any
        );

        await boardService.deleteBoard("board-1");

        expect(prismaMock.board.delete).toHaveBeenCalledWith({
          where: { id: "board-1" },
        });
      });
    });

    describe("unhappy path", () => {
      it("throws error when board not found", async () => {
        const error = new Error("Record not found");
        (error as any).code = "P2025";
        prismaMock.board.delete.mockRejectedValue(error);

        await expect(boardService.deleteBoard("non-existent")).rejects.toThrow(
          "Record not found"
        );
      });
    });
  });

  // ===========================================
  // duplicateBoard - Happy Path Tests
  // ===========================================
  describe("duplicateBoard", () => {
    describe("happy path", () => {
      it("duplicates board with columns and todos", async () => {
        const mockLabel = createMockLabel({ id: "label-1" });
        const mockSourceBoard = {
          ...createMockBoard({ id: "board-1", name: "Original" }),
          columns: [
            {
              ...createMockColumn({ id: "col-1", name: "Todo", position: 0 }),
              todos: [
                {
                  ...createMockTodo({ id: "todo-1", title: "Task 1" }),
                  labels: [mockLabel],
                },
              ],
            },
          ],
        };

        const mockDuplicatedBoard = {
          ...createMockBoard({ id: "board-2", name: "Original (Copy)" }),
          columns: [
            {
              ...createMockColumn({
                id: "col-2",
                name: "Todo",
                boardId: "board-2",
              }),
              todos: [
                {
                  ...createMockTodo({
                    id: "todo-2",
                    title: "Task 1",
                    columnId: "col-2",
                  }),
                  labels: [mockLabel],
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

        const result = await boardService.duplicateBoard("board-1");

        expect(result).not.toBeNull();
        expect(result?.name).toBe("Original (Copy)");
        expect(prismaMock.board.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: "Original (Copy)",
              position: 1,
            }),
          })
        );
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

        const result = await boardService.duplicateBoard("board-1");

        expect(result?.name).toBe("Empty (Copy)");
      });
    });

    describe("unhappy path", () => {
      it("returns null when source board not found", async () => {
        prismaMock.board.findUnique.mockResolvedValue(null);

        const result = await boardService.duplicateBoard("non-existent");

        expect(result).toBeNull();
        expect(prismaMock.board.create).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================
  // addColumn - Happy Path Tests
  // ===========================================
  describe("addColumn", () => {
    describe("happy path", () => {
      it("adds column to board", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });
        const mockColumn = createMockColumn({
          id: "col-1",
          name: "New Column",
          boardId: "board-1",
        });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: 2 },
        } as any);
        prismaMock.column.create.mockResolvedValue(mockColumn as any);

        const result = await boardService.addColumn("board-1", "New Column");

        expect(result).not.toBeNull();
        expect(result?.name).toBe("New Column");
        expect(prismaMock.column.create).toHaveBeenCalledWith({
          data: {
            name: "New Column",
            wipLimit: undefined,
            position: 3,
            boardId: "board-1",
          },
        });
      });

      it("adds column with WIP limit", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });
        const mockColumn = createMockColumn({
          id: "col-1",
          name: "In Progress",
          wipLimit: 5,
        });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.column.create.mockResolvedValue(mockColumn as any);

        const result = await boardService.addColumn(
          "board-1",
          "In Progress",
          5
        );

        expect(result?.wipLimit).toBe(5);
        expect(prismaMock.column.create).toHaveBeenCalledWith({
          data: {
            name: "In Progress",
            wipLimit: 5,
            position: 0,
            boardId: "board-1",
          },
        });
      });

      it("adds first column with position 0", async () => {
        const mockBoard = createMockBoard({ id: "board-1" });
        const mockColumn = createMockColumn({ position: 0 });

        prismaMock.board.findUnique.mockResolvedValue(mockBoard as any);
        prismaMock.column.aggregate.mockResolvedValue({
          _max: { position: null },
        } as any);
        prismaMock.column.create.mockResolvedValue(mockColumn as any);

        await boardService.addColumn("board-1", "First Column");

        expect(prismaMock.column.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              position: 0,
            }),
          })
        );
      });
    });

    describe("unhappy path", () => {
      it("returns null when board not found", async () => {
        prismaMock.board.findUnique.mockResolvedValue(null);

        const result = await boardService.addColumn(
          "non-existent",
          "New Column"
        );

        expect(result).toBeNull();
        expect(prismaMock.column.create).not.toHaveBeenCalled();
      });
    });
  });
});
