import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  useLabels,
  useLabel,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  labelKeys,
} from "./useLabels";
import { createQueryClientWrapper } from "../test/utils";
import { server } from "../test/mocks/server";
import { mockLabels, createMockLabel } from "../test/mocks/handlers";

describe("useLabels hook", () => {
  // Happy Path Tests
  describe("fetching labels", () => {
    it("fetches labels successfully", async () => {
      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(mockLabels.length);
      expect(result.current.data?.[0].name).toBe("Bug");
    });

    it("returns loading state initially", () => {
      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("returns empty array when no labels exist", async () => {
      server.use(
        http.get("/api/labels", () => {
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it("returns labels with todo counts", async () => {
      server.use(
        http.get("/api/labels", () => {
          return HttpResponse.json([
            { id: "label-1", name: "Bug", color: "#FF0000", _count: { todos: 5 } },
            { id: "label-2", name: "Feature", color: "#00FF00", _count: { todos: 3 } },
          ]);
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.[0]._count?.todos).toBe(5);
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles network error", async () => {
      server.use(
        http.get("/api/labels", () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.get("/api/labels", () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles service unavailable", async () => {
      server.use(
        http.get("/api/labels", () => {
          return HttpResponse.json(
            { error: "Service Unavailable" },
            { status: 503 }
          );
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useLabel hook", () => {
  // Happy Path Tests
  describe("fetching single label", () => {
    it("fetches label by ID successfully", async () => {
      const { result } = renderHook(() => useLabel("label-1"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe("label-1");
      expect(result.current.data?.name).toBe("Bug");
    });

    it("returns label with color", async () => {
      const { result } = renderHook(() => useLabel("label-1"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.color).toBe("#FF0000");
    });

    it("does not fetch when labelId is undefined", () => {
      const { result } = renderHook(() => useLabel(undefined), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent label", async () => {
      const { result } = renderHook(() => useLabel("non-existent"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error when fetching label", async () => {
      server.use(
        http.get("/api/labels/:id", () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useLabel("label-1"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useCreateLabel hook", () => {
  // Happy Path Tests
  describe("creating labels", () => {
    it("creates label successfully", async () => {
      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "New Label", color: "#0000FF" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("New Label");
      expect(result.current.data?.color).toBe("#0000FF");
    });

    it("creates label with various colors", async () => {
      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Purple Label", color: "#800080" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.color).toBe("#800080");
    });

    it("returns idle state initially", () => {
      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
    });

    it("returns created label with ID", async () => {
      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Label", color: "#123456" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBeDefined();
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles validation error for empty name", async () => {
      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "", color: "#0000FF" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for empty color", async () => {
      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Label", color: "" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for invalid color format", async () => {
      server.use(
        http.post("/api/labels", () => {
          return HttpResponse.json(
            { error: "Invalid color format" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Label", color: "red" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during creation", async () => {
      server.use(
        http.post("/api/labels", () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Label", color: "#0000FF" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure during creation", async () => {
      server.use(
        http.post("/api/labels", () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Label", color: "#0000FF" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles duplicate label name", async () => {
      server.use(
        http.post("/api/labels", () => {
          return HttpResponse.json(
            { error: "Label name already exists" },
            { status: 409 }
          );
        })
      );

      const { result } = renderHook(() => useCreateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Bug", color: "#0000FF" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useUpdateLabel hook", () => {
  // Happy Path Tests
  describe("updating labels", () => {
    it("updates label name successfully", async () => {
      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", name: "Updated Label" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("Updated Label");
    });

    it("updates label color successfully", async () => {
      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", color: "#00FF00" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.color).toBe("#00FF00");
    });

    it("updates multiple fields at once", async () => {
      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "label-1",
        name: "New Name",
        color: "#FFFFFF",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("returns updated label with original ID", async () => {
      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", name: "Updated" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("label-1");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent label", async () => {
      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "non-existent", name: "New Name" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during update", async () => {
      server.use(
        http.put("/api/labels/:id", () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", name: "Updated" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure during update", async () => {
      server.use(
        http.put("/api/labels/:id", () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", name: "Updated" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for invalid color", async () => {
      server.use(
        http.put("/api/labels/:id", () => {
          return HttpResponse.json(
            { error: "Invalid color format" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", color: "invalid" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles duplicate name when updating", async () => {
      server.use(
        http.put("/api/labels/:id", () => {
          return HttpResponse.json(
            { error: "Label name already exists" },
            { status: 409 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "label-1", name: "Feature" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useDeleteLabel hook", () => {
  // Happy Path Tests
  describe("deleting labels", () => {
    it("deletes label successfully", async () => {
      const { result } = renderHook(() => useDeleteLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("label-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("label-1");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent label", async () => {
      const { result } = renderHook(() => useDeleteLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("non-existent");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during deletion", async () => {
      server.use(
        http.delete("/api/labels/:id", () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("label-1");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure during deletion", async () => {
      server.use(
        http.delete("/api/labels/:id", () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useDeleteLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("label-1");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles deletion of label in use", async () => {
      server.use(
        http.delete("/api/labels/:id", () => {
          return HttpResponse.json(
            { error: "Label is assigned to todos" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteLabel(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("label-1");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("labelKeys", () => {
  it("generates correct query keys", () => {
    expect(labelKeys.all).toEqual(["labels"]);
    expect(labelKeys.detail("label-1")).toEqual(["labels", "label-1"]);
  });

  it("generates unique keys for different label IDs", () => {
    const key1 = labelKeys.detail("label-1");
    const key2 = labelKeys.detail("label-2");

    expect(key1).not.toEqual(key2);
  });
});
