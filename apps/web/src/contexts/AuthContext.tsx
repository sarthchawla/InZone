import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../lib/auth-client';

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (AUTH_BYPASS) {
    return <>{children}</>;
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) {
    // Preserve error query params so OAuth error messages aren't lost
    const loginPath = location.search ? `/login${location.search}` : '/login';
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}
