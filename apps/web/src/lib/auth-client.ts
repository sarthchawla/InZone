import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || '',
});

export const { useSession, signIn, signOut, signUp } = authClient;

/** Shared dev bypass user — must match the server-side DEV_USER in middleware/auth.ts */
export const DEV_USER = {
  id: 'dev-user-000',
  name: 'Dev User',
  email: 'dev@localhost',
  image: null,
} as const;
