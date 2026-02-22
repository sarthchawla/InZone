import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      className={cn(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
    />
  );
}

export function BoardCardSkeleton() {
  return (
    <div className="p-4 bg-card rounded-xl border border-border" data-testid="board-card-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ColumnSkeleton() {
  return (
    <div className="flex flex-col w-full md:w-72 md:min-w-72 rounded-xl bg-secondary p-3" data-testid="column-skeleton">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <TodoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function TodoCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-3" data-testid="todo-card-skeleton">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
    </div>
  );
}
