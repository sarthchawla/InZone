import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { BoardList } from './components/board/BoardList';
import { BoardView } from './components/board/BoardView';
import { ToastProvider } from './contexts/ToastContext';
import { AuthGuard } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { signOut } from './lib/auth-client';
import { useState } from 'react';
import { Agentation } from 'agentation';

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
        className="flex items-center gap-2 rounded-full hover:bg-stone-100 p-1 transition-colors"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-8 h-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-medium">
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="text-sm text-stone-700 hidden sm:inline">{user.name}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-white border border-stone-200 rounded-xl shadow-lg py-1 w-48">
            <div className="px-4 py-2 border-b border-stone-100">
              <p className="text-sm font-medium text-stone-900 truncate">{user.name}</p>
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
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
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <div className="h-screen flex flex-col overflow-hidden">
          <header className="bg-white border-b border-stone-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <Link to="/" className="inline-block">
                <h1 className="text-xl sm:text-2xl font-bold text-accent hover:text-accent-hover transition-colors">
                  InZone
                </h1>
              </Link>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AnimatedRoutes />
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
      </ToastProvider>
      <Agentation />
    </QueryClientProvider>
  );
}

export default App;
