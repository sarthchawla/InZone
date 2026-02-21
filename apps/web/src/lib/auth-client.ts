import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';

const baseURL = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), adminClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;

/** Shared dev bypass user — must match the server-side DEV_USER in middleware/auth.ts */
export const DEV_USER = {
  id: 'dev-user-000',
  name: 'Dev User',
  email: 'dev@localhost',
  image: null,
} as const;
