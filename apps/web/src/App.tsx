import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { BoardList } from './components/board/BoardList';
import { BoardView } from './components/board/BoardView';
import { Toaster } from 'sonner';
import { AuthGuard } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { signOut } from './lib/auth-client';
import { useState } from 'react';
import { Agentation } from 'agentation';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/app/ThemeToggle';
import { Breadcrumbs } from './components/app/Breadcrumbs';
import { CommandPalette } from './components/app/CommandPalette';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { RequestAccessPage } from './pages/RequestAccessPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvitesPage } from './pages/admin/InvitesPage';
import { RequestsPage } from './pages/admin/RequestsPage';
import { UsersPage } from './pages/admin/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = user && 'role' in user && (user as { role?: string }).role === 'admin';

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:bg-muted p-1 pr-2 transition-colors"
      >
        <div className="relative">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
              {user.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
          {isAdmin && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-purple-500 border-2 border-background rounded-full" title="Admin" />
          )}
        </div>
        <span className="text-sm text-secondary-foreground hidden sm:inline">{user.name}</span>
        {isAdmin && (
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            Admin
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-48">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-secondary-foreground hover:bg-muted transition-colors"
            >
              Settings
            </Link>
            {isAdmin && (
              <>
                <div className="border-t border-border my-1" />
                <Link
                  to="/admin/invites"
                  onClick={() => setOpen(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-secondary-foreground hover:bg-muted transition-colors"
                >
                  Manage Invites
                </Link>
                <Link
                  to="/admin/requests"
                  onClick={() => setOpen(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-secondary-foreground hover:bg-muted transition-colors"
                >
                  Access Requests
                </Link>
                <Link
                  to="/admin/users"
                  onClick={() => setOpen(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-secondary-foreground hover:bg-muted transition-colors"
                >
                  Manage Users
                </Link>
              </>
            )}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2.5 text-sm text-secondary-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Catches Better Auth's OAuth error redirects (e.g. /api/auth/error?error=unable_to_create_user)
 * and sends users to the appropriate frontend page instead of a blank screen.
 */
function AuthErrorRedirect() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('error') || '';

  if (errorCode === 'unable_to_create_user') {
    return <Navigate to="/request-access?error=no_access" replace />;
  }

  return <Navigate to={`/login?error=${encodeURIComponent(errorCode || 'oauth_error')}`} replace />;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user && 'role' in user && (user as { role?: string }).role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex-1 flex flex-col min-h-0"
      >
        <Routes location={location}>
          <Route path="/" element={<BoardList />} />
          <Route path="/board/:boardId" element={<BoardView />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin routes */}
          <Route
            path="/admin/invites"
            element={
              <AdminGuard>
                <InvitesPage />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <AdminGuard>
                <RequestsPage />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminGuard>
                <UsersPage />
              </AdminGuard>
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Better Auth error redirect — catches OAuth failures */}
        <Route path="/api/auth/error" element={<AuthErrorRedirect />} />

        {/* Public routes (no auth required) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <div className="h-screen flex flex-col">
                <header className="bg-card border-b border-border flex-shrink-0">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <Link to="/" className="inline-block">
                      <h1 className="text-xl sm:text-2xl font-bold text-primary hover:text-primary/90 transition-colors">
                        InZone
                      </h1>
                    </Link>
                    <div className="flex items-center gap-3">
                      <ThemeToggle />
                      <UserMenu />
                    </div>
                  </div>
                </header>
                <CommandPalette />
                <Breadcrumbs />
                <main className="flex-1 flex flex-col min-h-0 overflow-auto">
                  <AnimatedRoutes />
                </main>
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
          <Toaster position="bottom-right" richColors />
          <SpeedInsights />
          <Analytics />
        <Agentation />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
