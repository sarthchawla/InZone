import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

// Mock the auth module before importing
vi.mock("../lib/auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("better-auth/node", () => ({
  fromNodeHeaders: vi.fn((headers) => headers),
}));

import { requireAdmin } from "./requireAdmin.js";
import { auth } from "../lib/auth.js";

const mockedGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;

function createMockReqResNext() {
  const req = {
    headers: { authorization: "Bearer test-token" },
    user: undefined,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("requireAdmin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin user through - sets req.user and calls next()", async () => {
    const { req, res, next } = createMockReqResNext();
    mockedGetSession.mockResolvedValue({
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@example.com",
        image: "https://example.com/avatar.png",
        role: "admin",
      },
    });

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({
      id: "user-1",
      name: "Admin User",
      email: "admin@example.com",
      image: "https://example.com/avatar.png",
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks non-admin user - returns 403 with 'Admin access required'", async () => {
    const { req, res, next } = createMockReqResNext();
    mockedGetSession.mockResolvedValue({
      user: {
        id: "user-2",
        name: "Regular User",
        email: "user@example.com",
        image: null,
        role: "user",
      },
    });

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated request (no session) - returns 401", async () => {
    const { req, res, next } = createMockReqResNext();
    mockedGetSession.mockResolvedValue(null);

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks when session.user is null - returns 401", async () => {
    const { req, res, next } = createMockReqResNext();
    mockedGetSession.mockResolvedValue({ user: null });

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when getSession throws error", async () => {
    const { req, res, next } = createMockReqResNext();
    mockedGetSession.mockRejectedValue(new Error("Auth service unavailable"));

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});
