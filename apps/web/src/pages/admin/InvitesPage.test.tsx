import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/utils";

vi.mock("../../api/client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    delete: vi.fn(),
  },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { apiClient } from "../../api/client";
import { InvitesPage } from "./InvitesPage";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: [] });
});

describe("InvitesPage", () => {
  it("renders page heading 'Invite Management'", async () => {
    render(<InvitesPage />);
    expect(
      screen.getByRole("heading", { name: /invite management/i })
    ).toBeInTheDocument();
  });

  it("renders create invite form with email input", async () => {
    render(<InvitesPage />);
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create invite/i })
    ).toBeInTheDocument();
  });

  it("shows 'No pending invites' when empty", async () => {
    render(<InvitesPage />);
    await waitFor(() => {
      expect(screen.getByText(/no pending invites/i)).toBeInTheDocument();
    });
  });

  it("creates invite and shows link", async () => {
    mockPost.mockResolvedValueOnce({
      data: { inviteLink: "http://localhost/signup?token=abc" },
    });

    render(<InvitesPage />);

    const emailInput = screen.getByPlaceholderText("user@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /create invite/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/invites", {
        email: "test@example.com",
        role: "user",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost/signup?token=abc")
      ).toBeInTheDocument();
    });
  });

  it("shows pending invites list", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "inv-1",
          email: "invited@example.com",
          token: "tok-1",
          role: "user",
          status: "pending",
          expiresAt: "2026-03-01T00:00:00Z",
          createdAt: "2026-02-20T00:00:00Z",
        },
      ],
    });

    render(<InvitesPage />);

    await waitFor(() => {
      expect(screen.getByText("invited@example.com")).toBeInTheDocument();
    });
  });

  it("copy link button exists for pending invites", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "inv-1",
          email: "invited@example.com",
          token: "tok-1",
          role: "user",
          status: "pending",
          expiresAt: "2026-03-01T00:00:00Z",
          createdAt: "2026-02-20T00:00:00Z",
        },
      ],
    });

    render(<InvitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });
  });

  it("revoke button calls delete", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "inv-1",
          email: "invited@example.com",
          token: "tok-1",
          role: "user",
          status: "pending",
          expiresAt: "2026-03-01T00:00:00Z",
          createdAt: "2026-02-20T00:00:00Z",
        },
      ],
    });
    mockDelete.mockResolvedValueOnce({});

    render(<InvitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Revoke")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Revoke"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/invites/inv-1");
    });
  });
});
