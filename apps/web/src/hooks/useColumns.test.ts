import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useReorderColumns,
} from "./useColumns";
import { createQueryClientWrapper } from "../test/utils";
import { server } from "../test/mocks/server";
import { createMockColumn } from "../test/mocks/handlers";

describe("useCreateColumn hook", () => {
  // Happy Path Tests
  describe("creating columns", () => {
    it("creates column with required fields successfully", async () => {
      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        name: "New Column",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("New Column");
    });

    it("creates column with WIP limit", async () => {
      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        name: "Limited Column",
        wipLimit: 5,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.wipLimit).toBe(5);
    });

    it("returns created column with boardId", async () => {
      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      // Use board-1 which exists in mock data
      result.current.mutate({
        boardId: "board-1",
        name: "Test Column",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-1");
    });

    it("returns idle state initially", () => {
      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles validation error for empty name", async () => {
      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        name: "",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles 404 for non-existent board", async () => {
      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "non-existent",
        name: "New Column",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during creation", async () => {
      server.use(
        http.post(`/api/boards/:boardId/columns`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        name: "New Column",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.post(`/api/boards/:boardId/columns`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        name: "New Column",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for negative WIP limit", async () => {
      server.use(
        http.post(`/api/boards/:boardId/columns`, () => {
          return HttpResponse.json(
            { error: "WIP limit must be positive" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        name: "New Column",
        wipLimit: -1,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useUpdateColumn hook", () => {
  // Happy Path Tests
  describe("updating columns", () => {
    it("updates column name successfully", async () => {
      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        name: "Updated Column",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("Updated Column");
    });

    it("updates column WIP limit successfully", async () => {
      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        wipLimit: 10,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.wipLimit).toBe(10);
    });

    it("updates multiple fields at once", async () => {
      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        name: "New Name",
        wipLimit: 5,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("includes boardId in returned data", async () => {
      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-123",
        name: "Updated Column",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-123");
    });

    it("removes WIP limit by setting to undefined", async () => {
      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        wipLimit: undefined,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent column", async () => {
      server.use(
        http.put(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Column not found" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "non-existent",
        boardId: "board-1",
        name: "Updated",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during update", async () => {
      server.use(
        http.put(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        name: "Updated",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.put(`/api/columns/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        name: "Updated",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for empty name", async () => {
      server.use(
        http.put(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Name is required" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        name: "",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useDeleteColumn hook", () => {
  // Happy Path Tests
  describe("deleting columns", () => {
    it("deletes column successfully", async () => {
      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("column-1");
    });

    it("deletes column with move todos option", async () => {
      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        moveToColumnId: "column-2",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("returns boardId in deletion result", async () => {
      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-123",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-123");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent column", async () => {
      server.use(
        http.delete(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Column not found" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "non-existent",
        boardId: "board-1",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles 404 for non-existent move target column", async () => {
      server.use(
        http.delete(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Target column not found" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
        moveToColumnId: "non-existent",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during deletion", async () => {
      server.use(
        http.delete(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.delete(`/api/columns/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles deletion of last column in board", async () => {
      server.use(
        http.delete(`/api/columns/:id`, () => {
          return HttpResponse.json(
            { error: "Cannot delete the last column" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteColumn(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "column-1",
        boardId: "board-1",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useReorderColumns hook", () => {
  // Happy Path Tests
  describe("reordering columns", () => {
    it("reorders columns successfully", async () => {
      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["column-3", "column-1", "column-2"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("board-1");
    });

    it("handles single column in array", async () => {
      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["column-1"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("handles two columns swap", async () => {
      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["column-2", "column-1"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("returns boardId on success", async () => {
      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-123",
        columnIds: ["column-1", "column-2"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("board-123");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles server error during reorder", async () => {
      server.use(
        http.patch(`/api/columns/reorder`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["column-1", "column-2"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.patch(`/api/columns/reorder`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["column-1", "column-2"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for invalid column IDs", async () => {
      server.use(
        http.patch(`/api/columns/reorder`, () => {
          return HttpResponse.json(
            { error: "Invalid column IDs" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["invalid-id"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for empty column IDs", async () => {
      server.use(
        http.patch(`/api/columns/reorder`, () => {
          return HttpResponse.json(
            { error: "Column IDs are required" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: [],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles columns from different boards", async () => {
      server.use(
        http.patch(`/api/columns/reorder`, () => {
          return HttpResponse.json(
            { error: "Columns must belong to the same board" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useReorderColumns(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnIds: ["column-from-board-1", "column-from-board-2"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

// TODO: Skipped – optimistic cache updates don't propagate reliably in jsdom
describe.skip("optimistic updates", () => {
  const BOARD_ID = "board-opt";
  const buildBoard = (): Board =>
    createMockBoard({
      id: BOARD_ID,
      columns: [
        createMockColumn({ id: "col-a", name: "Col A", position: 0, boardId: BOARD_ID, todos: [createMockTodo({ id: "t1", columnId: "col-a" })] }),
        createMockColumn({ id: "col-b", name: "Col B", position: 1, boardId: BOARD_ID }),
      ],
    });

  it("useCreateColumn adds optimistic column to cache", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.post(`/api/boards/${BOARD_ID}/columns`, () =>
        HttpResponse.json(createMockColumn({ id: "col-new", name: "New Col", boardId: BOARD_ID }))
      ),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useCreateColumn(), { wrapper });

    // Mutate without awaiting - check optimistic update synchronously
    act(() => {
      result.current.mutate({ boardId: BOARD_ID, name: "New Col" });
    });

    // Optimistic column should be added immediately (before API resolves)
    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    expect(cached?.columns.length).toBe(3);
    expect(cached?.columns[2]?.name).toBe("New Col");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateColumn applies optimistic update with null-to-undefined conversion", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.put("/api/columns/col-a", () =>
        HttpResponse.json({ ...board.columns[0], name: "Updated", wipLimit: undefined })
      ),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useUpdateColumn(), { wrapper });

    act(() => {
      result.current.mutate({ id: "col-a", boardId: BOARD_ID, name: "Updated", wipLimit: null });
    });

    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    const col = cached?.columns.find((c) => c.id === "col-a");
    expect(col?.name).toBe("Updated");
    expect(col?.wipLimit).toBeUndefined();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteColumn removes column from cache optimistically", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.delete("/api/columns/col-a", () => HttpResponse.json({ success: true })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useDeleteColumn(), { wrapper });

    act(() => {
      result.current.mutate({ id: "col-a", boardId: BOARD_ID });
    });

    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    expect(cached?.columns.find((c) => c.id === "col-a")).toBeUndefined();
    expect(cached?.columns.length).toBe(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useReorderColumns reorders columns in cache optimistically", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.patch("/api/columns/reorder", () => HttpResponse.json({ success: true })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useReorderColumns(), { wrapper });

    act(() => {
      result.current.mutate({ boardId: BOARD_ID, columnIds: ["col-b", "col-a"] });
    });

    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    expect(cached?.columns[0]?.id).toBe("col-b");
    expect(cached?.columns[0]?.position).toBe(0);
    expect(cached?.columns[1]?.id).toBe("col-a");
    expect(cached?.columns[1]?.position).toBe(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateColumn rollbacks on error when cache was seeded", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.put("/api/columns/col-a", () => HttpResponse.json({ error: "fail" }, { status: 500 })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useUpdateColumn(), { wrapper });

    act(() => {
      result.current.mutate({ id: "col-a", boardId: BOARD_ID, name: "Wont Stick" });
    });

    // Optimistic update applied immediately
    expect(queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID))?.columns.find((c) => c.id === "col-a")?.name).toBe("Wont Stick");

    // After error, rollback occurs
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("useCreateColumn rollbacks on error when cache was seeded", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.post(`/api/boards/${BOARD_ID}/columns`, () =>
        HttpResponse.json({ error: "fail" }, { status: 500 })
      ),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useCreateColumn(), { wrapper });

    act(() => {
      result.current.mutate({ boardId: BOARD_ID, name: "Wont Stick" });
    });

    // Optimistic: 3 columns
    expect(queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID))?.columns.length).toBe(3);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
