import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import userEvent from "@testing-library/user-event";

// Mock the auth-client signIn
const mockEmailSignIn = vi.fn();
const mockUsernameSignIn = vi.fn();
const mockSocialSignIn = vi.fn();
vi.mock("../lib/auth-client", () => ({
  signIn: {
    email: (...args: unknown[]) => mockEmailSignIn(...args),
    username: (...args: unknown[]) => mockUsernameSignIn(...args),
    social: (...args: unknown[]) => mockSocialSignIn(...args),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { LoginPage } from "./LoginPage";

/** Helper to get the identifier (text) input and password input */
function getFormInputs() {
  const identifierInput = screen.getByRole("textbox");
  const passwordInput = document.querySelector(
    'input[type="password"]'
  ) as HTMLInputElement;
  return { identifierInput, passwordInput };
}

/** Fill in the login form using fireEvent (per CLAUDE.md guidelines) */
function fillForm(identifier: string, password: string) {
  const { identifierInput, passwordInput } = getFormInputs();
  fireEvent.change(identifierInput, { target: { value: identifier } });
  fireEvent.change(passwordInput, { target: { value: password } });
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the app title", () => {
      render(<LoginPage />);
      expect(screen.getByText("InZone")).toBeInTheDocument();
    });

    it("renders sign-in prompt text", () => {
      render(<LoginPage />);
      expect(screen.getByText("Sign in to manage your boards")).toBeInTheDocument();
    });

    it("renders Google sign-in button", () => {
      render(<LoginPage />);
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    });

    it("shows 'Request Access' link", () => {
      render(<LoginPage />);
      const link = screen.getByRole("link", { name: /request access/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/request-access");
    });

    it("shows 'Forgot password?' link", () => {
      render(<LoginPage />);
      const link = screen.getByRole("link", { name: /forgot password/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/reset-password");
    });

    it("disables submit button when fields are empty", () => {
      render(<LoginPage />);
      const button = screen.getByRole("button", { name: /sign in/i });
      expect(button).toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("calls signIn.social with google provider when button is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.click(screen.getByRole("button", { name: /continue with google/i }));

      expect(mockSocialSignIn).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: expect.stringContaining("/"),
      });
    });

    it("shows error message on failed login", async () => {
      mockEmailSignIn.mockResolvedValue({ error: { message: "Bad credentials" } });
      render(<LoginPage />);

      fillForm("test@example.com", "pass123");
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Bad credentials");
      });
    });

    it("calls signIn.email when input contains @", async () => {
      mockEmailSignIn.mockResolvedValue({ data: {} });
      render(<LoginPage />);

      fillForm("test@example.com", "pass123");
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockEmailSignIn).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "pass123",
        });
      });
    });

    it("calls signIn.username when input has no @", async () => {
      mockUsernameSignIn.mockResolvedValue({ data: {} });
      render(<LoginPage />);

      fillForm("johndoe", "pass123");
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockUsernameSignIn).toHaveBeenCalledWith({
          username: "johndoe",
          password: "pass123",
        });
      });
    });

    it("redirects to / on successful login", async () => {
      mockEmailSignIn.mockResolvedValue({ data: { session: {} } });
      render(<LoginPage />);

      fillForm("test@example.com", "pass123");
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });
  });
});
