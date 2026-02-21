import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/utils";

vi.mock("../../api/client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({}),
  },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { apiClient } from "../../api/client";
import { RequestsPage } from "./RequestsPage";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

const pendingRequest = {
  id: "req-1",
  email: "requester@example.com",
  name: "Test User",
  reason: null,
  status: "pending",
  role: "user",
  reviewedAt: null,
  createdAt: "2026-02-20T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: [] });
});

describe("RequestsPage", () => {
  it("renders heading 'Access Requests'", async () => {
    render(<RequestsPage />);
    expect(
      screen.getByRole("heading", { name: /access requests/i })
    ).toBeInTheDocument();
  });

  it("shows 'No pending requests' when empty", async () => {
    render(<RequestsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    });
  });

  it("renders pending requests", async () => {
    mockGet.mockResolvedValue({ data: [pendingRequest] });

    render(<RequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText(/requester@example.com/)).toBeInTheDocument();
    });
  });

  it("shows reason when provided", async () => {
    mockGet.mockResolvedValue({
      data: [{ ...pendingRequest, reason: "I need access for my project" }],
    });

    render(<RequestsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/I need access for my project/)
      ).toBeInTheDocument();
    });
  });

  it("role selector defaults to 'user'", async () => {
    mockGet.mockResolvedValue({ data: [pendingRequest] });

    render(<RequestsPage />);

    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("user");
    });
  });

  it("approve button calls post with role", async () => {
    mockGet.mockResolvedValue({ data: [pendingRequest] });
    mockPost.mockResolvedValue({});

    render(<RequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Approve"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/access-requests/req-1/approve", {
        role: "user",
      });
    });
  });

  it("reject button calls post to reject", async () => {
    mockGet.mockResolvedValue({ data: [pendingRequest] });
    mockPost.mockResolvedValue({});

    render(<RequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Reject"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/access-requests/req-1/reject");
    });
  });
});
