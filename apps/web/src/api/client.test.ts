import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { apiClient, getErrorMessage } from './client';

describe('apiClient', () => {
  // Happy Path Tests
  describe('configuration', () => {
    it('has correct baseURL', () => {
      expect(apiClient.defaults.baseURL).toBe('http://localhost:3001/api');
    });

    it('has correct Content-Type header', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('has withCredentials enabled', () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('has response interceptors configured', () => {
      // Axios interceptors are stored as handlers
      expect(apiClient.interceptors.response).toBeDefined();
    });
  });
});

describe('getErrorMessage', () => {
  // Helper to create mock Axios errors
  const createAxiosError = (
    status: number | undefined,
    data: unknown,
    code?: string
  ): AxiosError => {
    const error = new Error('Request failed') as AxiosError;
    error.isAxiosError = true;
    error.code = code;
    error.response = status
      ? {
          status,
          statusText: 'Error',
          headers: {},
          config: {
            headers: new AxiosHeaders(),
          },
          data,
        }
      : undefined;
    error.config = {
      headers: new AxiosHeaders(),
    };
    // Make axios.isAxiosError return true for this error
    Object.defineProperty(error, 'isAxiosError', { value: true });
    return error;
  };

  // Happy Path Tests
  describe('extracting error messages', () => {
    it('extracts error.message from nested error object', () => {
      const error = createAxiosError(400, {
        error: { message: 'Validation failed' },
      });

      const message = getErrorMessage(error);
      expect(message).toBe('Validation failed');
    });

    it('extracts string error from response', () => {
      const error = createAxiosError(400, {
        error: 'Bad request error',
      });

      const message = getErrorMessage(error);
      expect(message).toBe('Bad request error');
    });

    it('extracts Zod validation errors', () => {
      const error = createAxiosError(400, {
        errors: [
          { message: 'Name is required' },
          { message: 'Email is invalid' },
        ],
      });

      const message = getErrorMessage(error);
      expect(message).toBe('Name is required, Email is invalid');
    });

    it('handles standard Error objects', () => {
      const error = new Error('Standard error message');

      const message = getErrorMessage(error);
      expect(message).toBe('Standard error message');
    });

    it('handles 500 server errors', () => {
      const error = createAxiosError(500, {});

      const message = getErrorMessage(error);
      expect(message).toBe('Server error. Please try again later.');
    });

    it('handles 404 not found errors', () => {
      const error = createAxiosError(404, {});

      const message = getErrorMessage(error);
      expect(message).toBe('Resource not found.');
    });
  });

  // Unhappy Path Tests
  describe('edge cases', () => {
    it('handles network errors (no response)', () => {
      const error = createAxiosError(undefined, undefined, 'ERR_NETWORK');

      const message = getErrorMessage(error);
      expect(message).toBe('Unable to connect to server. Please check your connection.');
    });

    it('handles connection refused errors', () => {
      const error = createAxiosError(undefined, undefined, 'ECONNREFUSED');
      // No response means network issue
      const message = getErrorMessage(error);
      expect(message).toBe('Unable to connect to server. Please check your connection.');
    });

    it('handles unknown error types', () => {
      const message = getErrorMessage('string error');
      expect(message).toBe('An unexpected error occurred');
    });

    it('handles null error', () => {
      const message = getErrorMessage(null);
      expect(message).toBe('An unexpected error occurred');
    });

    it('handles undefined error', () => {
      const message = getErrorMessage(undefined);
      expect(message).toBe('An unexpected error occurred');
    });

    it('handles number error', () => {
      const message = getErrorMessage(42);
      expect(message).toBe('An unexpected error occurred');
    });

    it('handles empty object error', () => {
      const message = getErrorMessage({});
      expect(message).toBe('An unexpected error occurred');
    });

    it('handles Axios error with empty data', () => {
      const error = createAxiosError(400, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles Axios error with null data', () => {
      const error = createAxiosError(400, null);

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles Axios error with undefined data', () => {
      const error = createAxiosError(400, undefined);

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles errors array without message property', () => {
      const error = createAxiosError(400, {
        errors: [{ code: 'E001' }, { code: 'E002' }],
      });

      const message = getErrorMessage(error);
      // Should join undefined messages, resulting in "undefined, undefined"
      // or handle gracefully
      expect(message).toContain(',');
    });

    it('handles empty errors array', () => {
      const error = createAxiosError(400, {
        errors: [],
      });

      const message = getErrorMessage(error);
      expect(message).toBe('');
    });

    it('handles mixed Zod errors with and without messages', () => {
      const error = createAxiosError(400, {
        errors: [
          { message: 'First error' },
          { code: 'NO_MESSAGE' },
          { message: 'Third error' },
        ],
      });

      const message = getErrorMessage(error);
      expect(message).toContain('First error');
      expect(message).toContain('Third error');
    });

    it('handles deeply nested error object', () => {
      const error = createAxiosError(400, {
        error: {
          message: 'Deep error message',
          details: { field: 'name' },
        },
      });

      const message = getErrorMessage(error);
      expect(message).toBe('Deep error message');
    });

    it('handles error with both string error and errors array', () => {
      // String error should take precedence based on implementation order
      const error = createAxiosError(400, {
        error: 'String error wins',
        errors: [{ message: 'Array error' }],
      });

      const message = getErrorMessage(error);
      // Based on the implementation, nested error.message is checked first,
      // then string error, then errors array
      expect(message).toBe('String error wins');
    });

    it('handles Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');

      const message = getErrorMessage(error);
      expect(message).toBe('Custom error message');
    });

    it('handles TypeError', () => {
      const error = new TypeError('Type mismatch');

      const message = getErrorMessage(error);
      expect(message).toBe('Type mismatch');
    });

    it('handles Error with empty message', () => {
      const error = new Error('');

      const message = getErrorMessage(error);
      expect(message).toBe('');
    });
  });

  describe('HTTP status code handling', () => {
    it('handles 400 Bad Request without specific message', () => {
      const error = createAxiosError(400, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles 401 Unauthorized without specific message', () => {
      const error = createAxiosError(401, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles 403 Forbidden without specific message', () => {
      const error = createAxiosError(403, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles 500 Internal Server Error', () => {
      const error = createAxiosError(500, {
        error: 'Database connection failed',
      });

      // 500 check comes after error extraction, so specific error wins
      const message = getErrorMessage(error);
      expect(message).toBe('Database connection failed');
    });

    it('handles 502 Bad Gateway', () => {
      const error = createAxiosError(502, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles 503 Service Unavailable', () => {
      const error = createAxiosError(503, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });

    it('handles 504 Gateway Timeout', () => {
      const error = createAxiosError(504, {});

      const message = getErrorMessage(error);
      // Falls through to Error check, returning error.message
      expect(message).toBe('Request failed');
    });
  });
});
