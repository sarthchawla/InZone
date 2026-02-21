import { useSession, DEV_USER } from '../lib/auth-client';

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

export function useAuth() {
  const { data: session, isPending } = useSession();

  if (AUTH_BYPASS) {
    return { session: null, isPending: false, user: DEV_USER };
  }

  return { session, isPending, user: session?.user ?? null };
}
