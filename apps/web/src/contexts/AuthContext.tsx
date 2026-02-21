import { useSession } from '../lib/auth-client';
import { LoginPage } from '../pages/LoginPage';

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

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
    return <LoginPage />;
  }

  return <>{children}</>;
}
