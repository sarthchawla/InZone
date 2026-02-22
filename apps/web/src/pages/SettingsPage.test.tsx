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
    get: vi.fn().mockResolvedValue({ data: { configured: true } }),
    post: vi.fn(),
  },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { authClient } from "../lib/auth-client";
import { apiClient } from "../api/client";

const mockUpdateUser = authClient.updateUser as ReturnType<typeof vi.fn>;
const mockChangePassword = authClient.changePassword as ReturnType<typeof vi.fn>;
const mockRevokeOtherSessions = authClient.revokeOtherSessions as ReturnType<typeof vi.fn>;
const mockListAccounts = authClient.listAccounts as ReturnType<typeof vi.fn>;
const mockApiPost = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user has credential account
  mockListAccounts.mockResolvedValue({
    data: [{ providerId: "credential" }],
  });
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
});
