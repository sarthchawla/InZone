import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Validation target options for the middleware
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation error response structure
 */
export interface ValidationErrorResponse {
  errors: {
    field: string;
    message: string;
    code: string;
  }[];
}

/**
 * Creates an Express middleware that validates request data against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'query', or 'params')
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * const createBoardSchema = z.object({ name: z.string().min(1) });
 * router.post('/boards', validate(createBoardSchema), createBoardHandler);
 * ```
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const result = schema.parse(dataToValidate);

      // Replace the target with the parsed/coerced data
      req[target] = result;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        res.status(400).json(formattedErrors);
        return;
      }

      // Pass non-Zod errors to the error handler
      next(error);
    }
  };
}

/**
 * Creates a middleware that validates multiple targets at once
 *
 * @param schemas - Object mapping targets to their schemas
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * const schemas = {
 *   params: z.object({ id: z.string() }),
 *   body: z.object({ name: z.string() })
 * };
 * router.put('/boards/:id', validateMultiple(schemas), updateBoardHandler);
 * ```
 */
export function validateMultiple(
  schemas: Partial<Record<ValidationTarget, ZodSchema>>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: { field: string; message: string; code: string }[] = [];

    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      try {
        const dataToValidate = req[target as ValidationTarget];
        const result = schema.parse(dataToValidate);
        req[target as ValidationTarget] = result;
      } catch (error) {
        if (error instanceof ZodError) {
          const formatted = formatZodError(error);
          // Prefix field names with target for clarity
          const prefixedErrors = formatted.errors.map(err => ({
            ...err,
            field: `${target}.${err.field}`,
          }));
          allErrors.push(...prefixedErrors);
        } else {
          next(error);
          return;
        }
      }
    }

    if (allErrors.length > 0) {
      res.status(400).json({ errors: allErrors });
      return;
    }

    next();
  };
}

/**
 * Formats a ZodError into a user-friendly response structure
 */
export function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    errors: error.errors.map((err) => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      code: err.code,
    })),
  };
}

/**
 * Common validation schemas that can be reused across routes
 */
export const commonSchemas = {
  /** Validates a CUID string */
  cuid: z.string().min(1, 'ID is required'),

  /** Validates pagination parameters */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** Validates a hex color code */
  hexColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),

  /** Validates an ISO date string */
  isoDate: z.string().datetime({ message: 'Invalid date format. Expected ISO 8601 format.' }),

  /** Validates a non-empty trimmed string */
  nonEmptyString: (maxLength: number = 255) =>
    z.string()
      .transform(s => s.trim())
      .refine(s => s.length >= 1, 'This field is required')
      .refine(s => s.length <= maxLength, `Must be at most ${maxLength} characters`),
};

/**
 * Type helper to extract the validated type from a schema
 */
export type ValidatedData<T extends ZodSchema> = z.infer<T>;
