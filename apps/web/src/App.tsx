import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { BoardList } from './components/board/BoardList';
import { BoardView } from './components/board/BoardView';
import { ToastProvider } from './contexts/ToastContext';
import { AuthGuard } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { signOut } from './lib/auth-client';
import { useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 transition-colors"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-8 h-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="text-sm text-gray-700 hidden sm:inline">{user.name}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <Link to="/" className="inline-block">
                <h1 className="text-xl sm:text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  InZone
                </h1>
              </Link>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<BoardList />} />
              <Route path="/board/:boardId" element={<BoardView />} />
            </Routes>
          </main>
        </div>
      </AuthGuard>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppContent />
        <SpeedInsights />
        <Analytics />
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
