import { Link } from 'react-router-dom';
import { Button, ColumnSkeleton } from '../ui';

export function BoardLoadingState() {
  return (
    <div className="flex flex-col h-full" data-testid="board-view-loading">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-4">
          <div className="h-5 w-5 bg-stone-200 rounded animate-pulse" />
          <div className="h-7 w-48 bg-stone-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto p-4 md:p-6">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <ColumnSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BoardNotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4" data-testid="board-not-found">
      <p className="text-stone-500">Board not found</p>
      <Link to="/">
        <Button variant="primary">Back to Boards</Button>
      </Link>
    </div>
  );
}
