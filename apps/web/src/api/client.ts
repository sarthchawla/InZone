import axios from 'axios';

const baseURL = import.meta.env.PROD || import.meta.env.MODE === 'test'
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Extract a user-friendly error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Handle API error responses
    const data = error.response?.data;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (typeof data?.error === 'string') {
      return data.error;
    }
    if (data?.errors && Array.isArray(data.errors)) {
      // Zod validation errors
      return data.errors.map((e: { message?: string }) => e.message).join(', ');
    }
    // Handle network errors
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Unable to connect to server. Please check your connection.';
    }
    // Handle HTTP status codes
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    if (error.response?.status === 404) {
      return 'Resource not found.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
