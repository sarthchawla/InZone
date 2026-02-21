import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";

// Mock the auth-client signIn
const mockSocialSignIn = vi.fn();
vi.mock("../lib/auth-client", () => ({
  signIn: {
    social: (...args: unknown[]) => mockSocialSignIn(...args),
  },
}));

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
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
  });
});
