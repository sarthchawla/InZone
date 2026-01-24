import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardList } from './components/board/BoardList';
import { BoardView } from './components/board/BoardView';
import { ToastProvider } from './contexts/ToastContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200">
              <div className="px-6 py-4">
                <h1 className="text-2xl font-bold text-blue-600">InZone</h1>
              </div>
            </header>
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<BoardList />} />
                <Route path="/board/:boardId" element={<BoardView />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
