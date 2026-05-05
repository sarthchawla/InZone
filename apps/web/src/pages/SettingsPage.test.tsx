import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import { SettingsPage } from "./SettingsPage";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
    },
  }),
}));

vi.mock("../lib/auth-client", () => ({
  authClient: {
    updateUser: vi.fn(),
    changePassword: vi.fn(),
    revokeOtherSessions: vi.fn(),
    listAccounts: vi.fn().mockResolvedValue({
      data: [{ providerId: "credential" }],
    }),
  },
}));

vi.mock("../api/client", () => ({
  apiClient: {
    defaults: { baseURL: "/api" },
    get: vi.fn((url: string) => {
      if (url === "/mcp-tokens") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: { configured: true } });
    }),
    post: vi.fn(),
    delete: vi.fn(),
  },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { authClient } from "../lib/auth-client";
import { apiClient } from "../api/client";

const mockUpdateUser = authClient.updateUser as ReturnType<typeof vi.fn>;
const mockChangePassword = authClient.changePassword as ReturnType<typeof vi.fn>;
const mockRevokeOtherSessions = authClient.revokeOtherSessions as ReturnType<typeof vi.fn>;
const mockListAccounts = authClient.listAccounts as ReturnType<typeof vi.fn>;
const mockApiGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockApiPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockApiDelete = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
  mockApiGet.mockImplementation((url: string) => {
    if (url === "/mcp-tokens") {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: { configured: true } });
  });
  // Default: user has credential account
  mockListAccounts.mockResolvedValue({
    data: [{ providerId: "credential" }],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      text: () =>
        Promise.resolve(
          'event: message\ndata: {"result":{"content":[{"type":"text","text":"[]"}]},"jsonrpc":"2.0","id":1}\n\n'
        ),
    })
  );
});

describe("SettingsPage", () => {
  it("renders profile section with user name and username", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
  });

  it("shows email as read-only", () => {
    render(<SettingsPage />);
    expect(screen.getAllByText(/test@example\.com/).length).toBeGreaterThan(0);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it("renders Settings heading", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("saves name and username changes on profile form submit", async () => {
    mockUpdateUser.mockResolvedValueOnce({});

    render(<SettingsPage />);

    const nameInput = screen.getByDisplayValue("Test User");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    const usernameInput = screen.getByDisplayValue("testuser");
    fireEvent.change(usernameInput, { target: { value: "newusername" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        name: "Updated Name",
        username: "newusername",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Profile updated.")).toBeInTheDocument();
    });
  });

  it("shows Change Password form when user has credential account", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Change password")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Password" })).toBeInTheDocument();
  });

  it("shows Set Password form when user is OAuth-only", async () => {
    mockListAccounts.mockResolvedValue({
      data: [{ providerId: "google" }],
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Set a password")).toBeInTheDocument();
    });
    expect(screen.getByText(/You signed up with Google/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Current password")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set Password" })).toBeInTheDocument();
  });

  it("calls set-password API for OAuth-only users", async () => {
    mockListAccounts.mockResolvedValue({
      data: [{ providerId: "google" }],
    });
    mockApiPost.mockResolvedValueOnce({ data: { success: true } });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Set a password")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "MyNewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set Password" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/auth/set-password", {
        newPassword: "MyNewPass1!",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Password set! You can now sign in with email and password.")
      ).toBeInTheDocument();
    });
  });

  it("shows Security Questions section with Configured status", async () => {
    render(<SettingsPage />);

    expect(screen.getByText("Security questions")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Configured")).toBeInTheDocument();
    });
  });

  it("shows danger zone with Sign Out Others button", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out others/i })
    ).toBeInTheDocument();
  });

  it("calls revokeOtherSessions on sign out all click", async () => {
    mockRevokeOtherSessions.mockResolvedValueOnce({});

    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign out others/i })
    );

    await waitFor(() => {
      expect(mockRevokeOtherSessions).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("All other sessions revoked.")).toBeInTheDocument();
    });
  });

  it("changes password successfully for credential users", async () => {
    mockChangePassword.mockResolvedValueOnce({});

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Change password")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: "oldpass123",
        newPassword: "newpass456",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Password changed.")).toBeInTheDocument();
    });
  });

  it("shows error when change password fails", async () => {
    mockChangePassword.mockResolvedValueOnce({
      error: { message: "Wrong password" },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Change password")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "badpass" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Wrong password");
    });
  });

  it("shows security questions form when Update is clicked", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Update")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(screen.getByLabelText("Security question 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Security question 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Security question 3")).toBeInTheDocument();
    });
  });

  it("submits security questions form successfully", async () => {
    mockApiPost.mockResolvedValueOnce({});

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Update")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(screen.getByLabelText("Security question 1")).toBeInTheDocument();
    });

    const sq1 = screen.getByLabelText("Security question 1");
    const sq2 = screen.getByLabelText("Security question 2");
    const sq3 = screen.getByLabelText("Security question 3");

    fireEvent.change(sq1, {
      target: { value: "What was the name of your first pet?" },
    });
    fireEvent.change(sq2, {
      target: { value: "In what city were you born?" },
    });
    fireEvent.change(sq3, {
      target: { value: "What was the name of your first school?" },
    });

    const answerInputs = screen.getAllByPlaceholderText("Your answer");
    fireEvent.change(answerInputs[0], { target: { value: "Buddy" } });
    fireEvent.change(answerInputs[1], { target: { value: "Toronto" } });
    fireEvent.change(answerInputs[2], { target: { value: "Lincoln" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save Questions" })
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Questions" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/security-questions/setup", {
        questions: [
          { question: "What was the name of your first pet?", answer: "Buddy" },
          { question: "In what city were you born?", answer: "Toronto" },
          { question: "What was the name of your first school?", answer: "Lincoln" },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.queryByLabelText("Security question 1")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Configured")).toBeInTheDocument();
  });

  it("shows error when sign out all sessions fails", async () => {
    mockRevokeOtherSessions.mockRejectedValueOnce({
      response: { data: { error: "Session revoke failed" } },
    });

    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign out others/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Session revoke failed");
    });
  });

  it("disables Update Password button when fields are empty", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Change password")).toBeInTheDocument();
    });

    const changeBtn = screen.getByRole("button", { name: "Update Password" });
    expect(changeBtn).toBeDisabled();
  });

  it("renders MCP access with the current user id", async () => {
    render(<SettingsPage />);

    expect(screen.getByText("MCP Access")).toBeInTheDocument();
    expect(screen.getByText("MCP_IMPERSONATED_USER_ID")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/mcp-tokens");
    });
  });

  it("creates an MCP token and shows the raw token once", async () => {
    mockApiPost.mockResolvedValueOnce({
      data: {
        id: "token-1",
        name: "Claude Desktop",
        token: "iz_mcp_secret",
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Claude Desktop"), {
      target: { value: "Claude Desktop" },
    });
    fireEvent.change(screen.getByDisplayValue("90 days"), {
      target: { value: "never" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/mcp-tokens", {
        name: "Claude Desktop",
        expiresIn: "never",
      });
    });
    expect(screen.getByText("iz_mcp_secret")).toBeInTheDocument();
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });

  it("copies a generated MCP token", async () => {
    mockApiPost.mockResolvedValueOnce({
      data: {
        id: "token-1",
        name: "Claude Desktop",
        token: "iz_mcp_secret",
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Claude Desktop"), {
      target: { value: "Claude Desktop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));

    await waitFor(() => {
      expect(screen.getByText("iz_mcp_secret")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy Token" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("iz_mcp_secret");
    });
  });

  it("falls back to document copy when Clipboard API is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.assign(document, { execCommand });
    mockApiPost.mockResolvedValueOnce({
      data: {
        id: "token-1",
        name: "Claude Desktop",
        token: "iz_mcp_secret",
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Claude Desktop"), {
      target: { value: "Claude Desktop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Token" }));

    await waitFor(() => {
      expect(screen.getByText("iz_mcp_secret")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy Token" }));

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(screen.getByText("Copied to clipboard.")).toBeInTheDocument();
    });
  });

  it("revokes an existing MCP token", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/mcp-tokens") {
        return Promise.resolve({
          data: [
            {
            id: "token-1",
            name: "Claude Desktop",
            canReveal: true,
            expiresAt: null,
            lastUsedAt: null,
              revokedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: { configured: true } });
    });
    mockApiDelete.mockResolvedValueOnce({});

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Claude Desktop")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith("/mcp-tokens/token-1");
    });
  });

  it("reveals and copies an existing MCP token", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/mcp-tokens") {
        return Promise.resolve({
          data: [
            {
              id: "token-1",
              name: "Claude Desktop",
              canReveal: true,
              expiresAt: null,
              lastUsedAt: null,
              revokedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        });
      }
      if (url === "/mcp-tokens/token-1") {
        return Promise.resolve({
          data: {
            id: "token-1",
            name: "Claude Desktop",
            token: "iz_mcp_existing_secret",
            expiresAt: null,
            lastUsedAt: null,
            revokedAt: null,
            createdAt: new Date().toISOString(),
          },
        });
      }
      return Promise.resolve({ data: { configured: true } });
    });

    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Show Token" }));

    expect(await screen.findByText("iz_mcp_existing_secret")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Token" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("iz_mcp_existing_secret");
    });
  });

  it("marks hash-only MCP tokens as unavailable for reveal", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/mcp-tokens") {
        return Promise.resolve({
          data: [
            {
              id: "token-1",
              name: "Legacy Token",
              canReveal: false,
              expiresAt: null,
              lastUsedAt: null,
              revokedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: { configured: true } });
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Legacy Token")).toBeInTheDocument();
    });
    expect(screen.getByText(/cannot be shown again/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Token" })).toBeDisabled();
  });

  it("links to the MCP playground dev app", async () => {
    const open = vi.fn();
    Object.assign(window, { open });

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Open Playground" }));

    expect(open).toHaveBeenCalledWith("http://localhost:5273/", "_blank", "noopener,noreferrer");
  });
});
