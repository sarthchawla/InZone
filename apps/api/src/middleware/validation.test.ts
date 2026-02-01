import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validate,
  validateMultiple,
  formatZodError,
  commonSchemas,
  ValidationTarget,
} from './validation.js';

describe('validate middleware', () => {
  const mockNext: NextFunction = vi.fn();

  const createMockReq = (data: Partial<Request> = {}): Request => {
    return {
      body: {},
      query: {},
      params: {},
      ...data,
    } as Request;
  };

  const createMockRes = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Tests
  describe('successful validation', () => {
    it('validates body successfully and calls next()', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: 'Test Board' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('validates query parameters successfully', () => {
      const schema = z.object({
        page: z.coerce.number().optional(),
        search: z.string().optional(),
      });
      const middleware = validate(schema, 'query');

      const req = createMockReq({ query: { page: '1', search: 'test' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.query.page).toBe(1); // Coerced to number
    });

    it('validates URL params successfully', () => {
      const schema = z.object({ id: z.string().min(1) });
      const middleware = validate(schema, 'params');

      const req = createMockReq({ params: { id: 'board-123' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('transforms data according to schema', () => {
      const schema = z.object({
        name: z.string().transform((s) => s.trim().toUpperCase()),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: '  test  ' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(req.body.name).toBe('TEST');
    });

    it('applies default values from schema', () => {
      const schema = z.object({
        name: z.string(),
        priority: z.string().default('MEDIUM'),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: 'Task' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(req.body.priority).toBe('MEDIUM');
    });

    it('uses body as default target when not specified', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validate(schema);

      const req = createMockReq({ body: { name: 'Test' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validates nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({
        body: {
          user: {
            name: 'John',
            email: 'john@example.com',
          },
        },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validates arrays in body', () => {
      const schema = z.object({
        labelIds: z.array(z.string()).min(1),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({
        body: { labelIds: ['label-1', 'label-2'] },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // Unhappy Path Tests
  describe('validation errors', () => {
    it('returns 400 for missing required field', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: {} });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            code: 'invalid_type',
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid field type', () => {
      const schema = z.object({ age: z.number() });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { age: 'not-a-number' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            code: 'invalid_type',
          }),
        ]),
      });
    });

    it('returns 400 for string too short', () => {
      const schema = z.object({ name: z.string().min(3, 'Name must be at least 3 characters') });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: 'ab' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: 'Name must be at least 3 characters',
            code: 'too_small',
          }),
        ]),
      });
    });

    it('returns 400 for string too long', () => {
      const schema = z.object({ name: z.string().max(10) });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: 'This is a very long string' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            code: 'too_big',
          }),
        ]),
      });
    });

    it('returns 400 for invalid email format', () => {
      const schema = z.object({ email: z.string().email() });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { email: 'not-an-email' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            code: 'invalid_string',
          }),
        ]),
      });
    });

    it('returns 400 for invalid enum value', () => {
      const schema = z.object({ priority: z.enum(['LOW', 'MEDIUM', 'HIGH']) });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { priority: 'INVALID' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'priority',
            code: 'invalid_enum_value',
          }),
        ]),
      });
    });

    it('returns multiple errors for multiple invalid fields', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: '', age: -5 } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.errors).toHaveLength(2);
    });

    it('returns 400 for invalid nested object', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({
        body: {
          user: {
            name: 'John',
            email: 'invalid-email',
          },
        },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'user.email',
          }),
        ]),
      });
    });

    it('returns 400 for empty array when min is required', () => {
      const schema = z.object({
        labelIds: z.array(z.string()).min(1, 'At least one label required'),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { labelIds: [] } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'labelIds',
            message: 'At least one label required',
          }),
        ]),
      });
    });

    it('returns 400 for invalid date format', () => {
      const schema = z.object({ dueDate: z.string().datetime() });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { dueDate: 'not-a-date' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'dueDate',
            code: 'invalid_string',
          }),
        ]),
      });
    });

    it('passes non-Zod errors to next()', () => {
      const schema = z.object({ name: z.string() });
      // Create a mock that throws a regular error
      const badSchema = {
        parse: () => {
          throw new Error('Unexpected error');
        },
      } as unknown as z.ZodSchema;

      const middleware = validate(badSchema, 'body');

      const req = createMockReq({ body: { name: 'test' } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty body object', () => {
      const schema = z.object({
        name: z.string().optional(),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: {} });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('handles undefined body', () => {
      const schema = z.object({
        name: z.string(),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: undefined });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles null values in body', () => {
      const schema = z.object({
        name: z.string().nullable(),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: null } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.body.name).toBeNull();
    });

    it('strips unknown fields when using strict()', () => {
      const schema = z.object({
        name: z.string(),
      }).strict();
      const middleware = validate(schema, 'body');

      const req = createMockReq({
        body: { name: 'Test', extraField: 'should cause error' },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles very long input strings gracefully', () => {
      const schema = z.object({
        name: z.string().max(100),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({ body: { name: 'A'.repeat(1000) } });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles special characters in strings', () => {
      const schema = z.object({
        name: z.string(),
      });
      const middleware = validate(schema, 'body');

      const req = createMockReq({
        body: { name: '<script>alert("xss")</script>' },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      // Zod doesn't sanitize by default, so this passes
      expect(mockNext).toHaveBeenCalled();
      expect(req.body.name).toBe('<script>alert("xss")</script>');
    });
  });
});

describe('validateMultiple middleware', () => {
  const mockNext: NextFunction = vi.fn();

  const createMockReq = (data: Partial<Request> = {}): Request => {
    return {
      body: {},
      query: {},
      params: {},
      ...data,
    } as Request;
  };

  const createMockRes = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Tests
  describe('successful multi-target validation', () => {
    it('validates params and body together', () => {
      const middleware = validateMultiple({
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
      });

      const req = createMockReq({
        params: { id: 'board-123' },
        body: { name: 'Updated Board' },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validates all three targets', () => {
      const middleware = validateMultiple({
        params: z.object({ id: z.string() }),
        query: z.object({ include: z.string().optional() }),
        body: z.object({ name: z.string() }),
      });

      const req = createMockReq({
        params: { id: 'board-123' },
        query: { include: 'columns' },
        body: { name: 'Test' },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // Unhappy Path Tests
  describe('validation errors', () => {
    it('returns errors from multiple targets with prefixes', () => {
      const middleware = validateMultiple({
        params: z.object({ id: z.string().min(1) }),
        body: z.object({ name: z.string().min(1) }),
      });

      const req = createMockReq({
        params: { id: '' },
        body: { name: '' },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.errors).toHaveLength(2);
      expect(response.errors[0].field).toMatch(/^(params|body)\./);
      expect(response.errors[1].field).toMatch(/^(params|body)\./);
    });

    it('collects all errors before responding', () => {
      const middleware = validateMultiple({
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(1),
          age: z.number().positive(),
        }),
      });

      const req = createMockReq({
        params: { id: 'not-a-uuid' },
        body: { name: '', age: -1 },
      });
      const res = createMockRes();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('formatZodError', () => {
  it('formats single error', () => {
    const schema = z.object({ name: z.string() });
    try {
      schema.parse({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const result = formatZodError(error);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toHaveProperty('field');
        expect(result.errors[0]).toHaveProperty('message');
        expect(result.errors[0]).toHaveProperty('code');
      }
    }
  });

  it('formats multiple errors', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });
    try {
      schema.parse({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const result = formatZodError(error);
        expect(result.errors).toHaveLength(2);
      }
    }
  });

  it('handles nested field paths', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string(),
        }),
      }),
    });
    try {
      schema.parse({ user: { profile: {} } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const result = formatZodError(error);
        expect(result.errors[0].field).toBe('user.profile.name');
      }
    }
  });

  it('handles root-level errors', () => {
    const schema = z.string();
    try {
      schema.parse(123);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const result = formatZodError(error);
        expect(result.errors[0].field).toBe('root');
      }
    }
  });
});

describe('commonSchemas', () => {
  describe('cuid', () => {
    it('accepts valid CUID strings', () => {
      expect(() => commonSchemas.cuid.parse('cjld2cjxh0000qzrmn831i7rn')).not.toThrow();
    });

    it('rejects empty string', () => {
      expect(() => commonSchemas.cuid.parse('')).toThrow();
    });
  });

  describe('pagination', () => {
    it('parses valid pagination params', () => {
      const result = commonSchemas.pagination.parse({ page: '2', limit: '50' });
      expect(result).toEqual({ page: 2, limit: 50 });
    });

    it('applies defaults', () => {
      const result = commonSchemas.pagination.parse({});
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('rejects page < 1', () => {
      expect(() => commonSchemas.pagination.parse({ page: '0' })).toThrow();
    });

    it('rejects limit > 100', () => {
      expect(() => commonSchemas.pagination.parse({ limit: '200' })).toThrow();
    });

    it('rejects negative page', () => {
      expect(() => commonSchemas.pagination.parse({ page: '-1' })).toThrow();
    });
  });

  describe('hexColor', () => {
    it('accepts 6-digit hex color', () => {
      expect(() => commonSchemas.hexColor.parse('#FF5733')).not.toThrow();
    });

    it('accepts 3-digit hex color', () => {
      expect(() => commonSchemas.hexColor.parse('#F53')).not.toThrow();
    });

    it('accepts lowercase hex', () => {
      expect(() => commonSchemas.hexColor.parse('#ff5733')).not.toThrow();
    });

    it('rejects invalid hex color', () => {
      expect(() => commonSchemas.hexColor.parse('FF5733')).toThrow(); // Missing #
      expect(() => commonSchemas.hexColor.parse('#GGG')).toThrow(); // Invalid characters
      expect(() => commonSchemas.hexColor.parse('#FFFF')).toThrow(); // Wrong length
      expect(() => commonSchemas.hexColor.parse('red')).toThrow(); // Named color
    });
  });

  describe('isoDate', () => {
    it('accepts valid ISO date', () => {
      expect(() =>
        commonSchemas.isoDate.parse('2025-01-24T10:30:00.000Z')
      ).not.toThrow();
    });

    it('rejects invalid date formats', () => {
      expect(() => commonSchemas.isoDate.parse('2025-01-24')).toThrow();
      expect(() => commonSchemas.isoDate.parse('not-a-date')).toThrow();
      expect(() => commonSchemas.isoDate.parse('01/24/2025')).toThrow();
    });
  });

  describe('nonEmptyString', () => {
    it('accepts valid string', () => {
      const schema = commonSchemas.nonEmptyString(100);
      expect(() => schema.parse('Valid string')).not.toThrow();
    });

    it('trims whitespace', () => {
      const schema = commonSchemas.nonEmptyString(100);
      expect(schema.parse('  trimmed  ')).toBe('trimmed');
    });

    it('rejects empty string', () => {
      const schema = commonSchemas.nonEmptyString(100);
      expect(() => schema.parse('')).toThrow();
    });

    it('rejects whitespace-only string', () => {
      const schema = commonSchemas.nonEmptyString(100);
      // After trim, this becomes empty and fails min(1)
      expect(() => schema.parse('   ')).toThrow();
    });

    it('rejects string exceeding max length', () => {
      const schema = commonSchemas.nonEmptyString(10);
      expect(() => schema.parse('This string is too long')).toThrow();
    });

    it('uses default max length', () => {
      const schema = commonSchemas.nonEmptyString();
      expect(() => schema.parse('A'.repeat(255))).not.toThrow();
      expect(() => schema.parse('A'.repeat(256))).toThrow();
    });
  });
});
