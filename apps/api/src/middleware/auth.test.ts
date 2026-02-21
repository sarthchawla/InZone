import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";

// Mock the auth module before importing requireAuth
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

import { requireAuth } from "./auth.js";
import { auth } from "../lib/auth.js";

describe("requireAuth middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe("auth bypass mode", () => {
    const originalEnv = process.env.VITE_AUTH_BYPASS;

    beforeEach(() => {
      process.env.VITE_AUTH_BYPASS = "true";
    });

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.VITE_AUTH_BYPASS;
      } else {
        process.env.VITE_AUTH_BYPASS = originalEnv;
      }
    });

    it("injects dev user when VITE_AUTH_BYPASS is true", async () => {
      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: "dev-user-000",
        name: "Dev User",
        email: "dev@localhost",
        image: null,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("does not call auth.api.getSession when bypassed", async () => {
      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(auth.api.getSession).not.toHaveBeenCalled();
    });
  });

  describe("authenticated requests", () => {
    const originalEnv = process.env.VITE_AUTH_BYPASS;

    beforeEach(() => {
      delete process.env.VITE_AUTH_BYPASS;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.VITE_AUTH_BYPASS = originalEnv;
      }
    });

    it("sets req.user from session and calls next", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        },
      };
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as never);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.jpg",
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("returns 401 when session is null", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as never);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("returns 401 when getSession throws", async () => {
      vi.mocked(auth.api.getSession).mockRejectedValue(new Error("Session error"));

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
