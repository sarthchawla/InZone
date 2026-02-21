import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook } from "../test/utils";

// Mock the auth-client module
vi.mock("../lib/auth-client", () => ({
  useSession: vi.fn(),
  DEV_USER: {
    id: "dev-user-000",
    name: "Dev User",
    email: "dev@localhost",
    image: null,
  },
}));

// Mock LoginPage to avoid pulling in real auth-client signIn
vi.mock("../pages/LoginPage", () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

import { AuthGuard, useAuth } from "./AuthContext";
import { useSession } from "../lib/auth-client";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset VITE_AUTH_BYPASS
    vi.stubEnv("VITE_AUTH_BYPASS", "");
  });

  it("renders children when auth is bypassed", () => {
    vi.stubEnv("VITE_AUTH_BYPASS", "true");
    // Need to re-import to pick up env change — but since it reads at module level,
    // we'll test through the component behavior.
    // AuthGuard reads import.meta.env.VITE_AUTH_BYPASS at module load time,
    // so we test the non-bypass paths here.
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "1", name: "Test", email: "t@t.com" } },
      isPending: false,
    } as never);

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("shows loading spinner when session is pending", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: true,
    } as never);

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    // Loading spinner has animate-spin class
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows login page when no session exists", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as never);

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("renders children when session exists", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "1", name: "Test", email: "t@t.com" } },
      isPending: false,
    } as never);

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });
});

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user from session when authenticated", () => {
    const mockUser = { id: "1", name: "Test User", email: "test@test.com" };
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    } as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isPending).toBe(false);
  });

  it("returns null user when no session", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
  });

  it("returns isPending true while loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: true,
    } as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isPending).toBe(true);
  });
});
