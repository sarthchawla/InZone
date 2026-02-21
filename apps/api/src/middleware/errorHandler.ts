import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    res.status(400).json({ errors: err.errors });
    return;
  }

  // Handle Prisma not-found errors
  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      code: err.code,
    },
  });
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
