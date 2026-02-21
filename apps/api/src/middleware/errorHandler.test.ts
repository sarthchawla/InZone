import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { errorHandler, createError, AppError } from "./errorHandler.js";

describe("errorHandler middleware", () => {
  const mockReq = {} as Request;
  const mockNext: NextFunction = vi.fn();

  const createMockRes = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Happy Path Tests
  describe("error responses", () => {
    it("handles AppError with custom status code", () => {
      const res = createMockRes();
      const error = createError("Not Found", 404, "NOT_FOUND");

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Not Found",
          code: "NOT_FOUND",
        },
      });
    });

    it("handles AppError with 400 status code", () => {
      const res = createMockRes();
      const error = createError("Bad Request", 400, "VALIDATION_ERROR");

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Bad Request",
          code: "VALIDATION_ERROR",
        },
      });
    });

    it("handles generic Error with 500 status code", () => {
      const res = createMockRes();
      const error = new Error("Unexpected error");

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Unexpected error",
          code: undefined,
        },
      });
    });

    it("logs the error to console", () => {
      const res = createMockRes();
      const error = new Error("Test error");
      const consoleSpy = vi.spyOn(console, "error");

      errorHandler(error, mockReq, res, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith("Error:", error);
    });
  });

  describe("Zod validation errors", () => {
    it("handles ZodError with 400 status and errors array", () => {
      const res = createMockRes();
      const schema = z.object({ name: z.string().min(1) });
      let zodError: z.ZodError;
      try {
        schema.parse({ name: "" });
      } catch (e) {
        zodError = e as z.ZodError;
      }

      errorHandler(zodError! as unknown as AppError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ errors: zodError!.errors });
    });

    it("does not log Zod errors to console", () => {
      const res = createMockRes();
      const consoleSpy = vi.spyOn(console, "error");
      const schema = z.object({ email: z.string().email() });
      let zodError: z.ZodError;
      try {
        schema.parse({ email: "invalid" });
      } catch (e) {
        zodError = e as z.ZodError;
      }

      errorHandler(zodError! as unknown as AppError, mockReq, res, mockNext);

      // console.error is called in beforeEach mock, but errorHandler should not call it for Zod errors
      // The Zod branch returns before reaching console.error
      expect(consoleSpy).not.toHaveBeenCalledWith("Error:", expect.anything());
    });
  });

  describe("Prisma not-found errors", () => {
    it("handles Prisma P2025 error with 404 status", () => {
      const res = createMockRes();
      const error = new Error("Record not found") as AppError;
      (error as { code?: string }).code = "P2025";

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Resource not found" });
    });

    it("does not log Prisma P2025 errors to console", () => {
      const res = createMockRes();
      const consoleSpy = vi.spyOn(console, "error");
      const error = new Error("Record not found") as AppError;
      (error as { code?: string }).code = "P2025";

      errorHandler(error, mockReq, res, mockNext);

      expect(consoleSpy).not.toHaveBeenCalledWith("Error:", expect.anything());
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles error without message", () => {
      const res = createMockRes();
      const error = new Error();

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Internal Server Error",
          code: undefined,
        },
      });
    });

    it("handles error with empty message", () => {
      const res = createMockRes();
      const error = new Error("");

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Internal Server Error",
          code: undefined,
        },
      });
    });

    it("handles AppError without code", () => {
      const res = createMockRes();
      const error = createError("Server Error", 500);

      errorHandler(error, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: "Server Error",
          code: undefined,
        },
      });
    });
  });
});

describe("createError helper", () => {
  it("creates error with all properties", () => {
    const error = createError("Test message", 404, "TEST_CODE");

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Test message");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("TEST_CODE");
  });

  it("creates error without code", () => {
    const error = createError("Test message", 500);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Test message");
    expect(error.statusCode).toBe(500);
    expect(error.code).toBeUndefined();
  });

  it("creates error with different status codes", () => {
    const error400 = createError("Bad Request", 400);
    const error401 = createError("Unauthorized", 401);
    const error403 = createError("Forbidden", 403);
    const error404 = createError("Not Found", 404);
    const error500 = createError("Server Error", 500);

    expect(error400.statusCode).toBe(400);
    expect(error401.statusCode).toBe(401);
    expect(error403.statusCode).toBe(403);
    expect(error404.statusCode).toBe(404);
    expect(error500.statusCode).toBe(500);
  });
});
