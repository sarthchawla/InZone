import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import { ResetPasswordPage } from "./ResetPasswordPage";

vi.mock("../api/client", () => ({
  apiClient: { post: vi.fn() },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

vi.mock("../lib/auth-client", () => ({
  authClient: { resetPassword: vi.fn() },
}));

import { apiClient } from "../api/client";
import { authClient } from "../lib/auth-client";

const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockResetPassword = authClient.resetPassword as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

/** Helper: get the text input in step 1 */
function getIdentifierInput() {
  return screen.getByRole("textbox");
}

/** Helper: navigate through step 1 -> step 2 */
async function goToStep2() {
  mockPost.mockResolvedValueOnce({
    data: { questions: ["Q1?", "Q2?", "Q3?"] },
  });

  fireEvent.change(getIdentifierInput(), {
    target: { value: "user@test.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await waitFor(() => {
    expect(screen.getByText("Answer Your Security Questions")).toBeInTheDocument();
  });
}

/** Helper: fill answers and navigate step 2 -> step 3 */
async function goToStep3() {
  mockPost.mockResolvedValueOnce({ data: { resetToken: "tok" } });

  const inputs = screen.getAllByRole("textbox");
  fireEvent.change(inputs[0], { target: { value: "A1" } });
  fireEvent.change(inputs[1], { target: { value: "A2" } });
  fireEvent.change(inputs[2], { target: { value: "A3" } });

  fireEvent.click(screen.getByRole("button", { name: "Verify" }));

  await waitFor(() => {
    expect(screen.getByText("Set New Password")).toBeInTheDocument();
  });
}

describe("ResetPasswordPage", () => {
  it("renders step 1 with identifier input and Continue button", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Email or Username")).toBeInTheDocument();
    expect(getIdentifierInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("shows step progress indicator with 3 steps", () => {
    render(<ResetPasswordPage />);
    const progress = screen.getByRole("group", {
      name: /password reset progress/i,
    });
    expect(progress).toBeInTheDocument();
    expect(screen.getByText("Identify")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("disables Continue button when identifier is empty", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("advances to step 2 showing security questions", async () => {
    render(<ResetPasswordPage />);
    await goToStep2();

    expect(mockPost).toHaveBeenCalledWith("/security-questions/questions", {
      identifier: "user@test.com",
    });
  });

  it("shows 3 question fields in step 2", async () => {
    render(<ResetPasswordPage />);
    await goToStep2();

    expect(screen.getByText("Q1?")).toBeInTheDocument();
    expect(screen.getByText("Q2?")).toBeInTheDocument();
    expect(screen.getByText("Q3?")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
  });

  it("shows error when verification fails", async () => {
    render(<ResetPasswordPage />);
    await goToStep2();

    mockPost.mockRejectedValueOnce({
      response: { data: { error: "Incorrect answers" } },
    });

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "A1" } });
    fireEvent.change(inputs[1], { target: { value: "A2" } });
    fireEvent.change(inputs[2], { target: { value: "A3" } });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Incorrect answers");
    });
  });

  it("advances to step 3 with new password form after verification", async () => {
    render(<ResetPasswordPage />);
    await goToStep2();
    await goToStep3();

    expect(screen.getByText("New Password")).toBeInTheDocument();
    expect(screen.getByText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset Password" })).toBeInTheDocument();
  });

  it("shows step progress indicator on each step", async () => {
    render(<ResetPasswordPage />);

    // Step 1: progress visible
    expect(
      screen.getByRole("group", { name: /password reset progress/i })
    ).toBeInTheDocument();

    // Advance to step 2
    await goToStep2();
    expect(
      screen.getByRole("group", { name: /password reset progress/i })
    ).toBeInTheDocument();

    // Advance to step 3
    await goToStep3();
    expect(
      screen.getByRole("group", { name: /password reset progress/i })
    ).toBeInTheDocument();
  });

  it("shows success message after password reset", async () => {
    mockResetPassword.mockResolvedValueOnce({ error: null });

    render(<ResetPasswordPage />);
    await goToStep2();
    await goToStep3();

    // Password inputs are type="password" so query via the container
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], {
      target: { value: "StrongP@ss1" },
    });
    fireEvent.change(passwordInputs[1], {
      target: { value: "StrongP@ss1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(screen.getByText("Password Reset!")).toBeInTheDocument();
    });

    expect(mockResetPassword).toHaveBeenCalledWith({
      newPassword: "StrongP@ss1",
      token: "tok",
    });
  });

  it("shows Back to Sign In link", () => {
    render(<ResetPasswordPage />);
    const link = screen.getByRole("link", { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/login");
  });
});
