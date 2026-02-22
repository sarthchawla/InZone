import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, Clock, Pencil, Trash2 } from 'lucide-react';
import { useBoards, useCreateBoard, useDeleteBoard, useTemplates } from '../../hooks/useBoards';
import { Input, BoardCardSkeleton, Button } from '../ui';
import { toast } from '../../lib/toast';
import { getErrorMessage } from '../../api/client';
import { cn } from '../../lib/utils';

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ------------------------------------------------------------------ */
/*  Inline Creation Form                                               */
/* ------------------------------------------------------------------ */

function InlineCreateForm({
  onCancel,
  autoFocus = true,
}: {
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const { data: templates } = useTemplates();
  const createBoard = useCreateBoard();
  // toast imported from lib/toast

  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleCreate = () => {
    if (!name.trim()) return;
    setCreateError(null);
    createBoard.mutate(
      {
        name: name.trim(),
        templateId: selectedTemplate || undefined,
      },
      {
        onSuccess: () => {
          setName('');
          setSelectedTemplate('');
          toast.success('Board created successfully');
          onCancel?.();
        },
        onError: (error) => {
          setCreateError(getErrorMessage(error));
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <div className="space-y-3" data-testid="inline-create-form">
      {createError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
          {createError}
        </div>
      )}
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Board name..."
        data-testid="board-name-input"
      />

      {/* Template chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedTemplate('')}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            selectedTemplate === ''
              ? 'bg-primary text-white border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-accent-muted',
          )}
        >
          Empty board
        </button>
        {templates?.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplate(t.id)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              selectedTemplate === t.id
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-accent-muted',
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || createBoard.isPending}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            'bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {createBoard.isPending ? 'Creating...' : 'Create'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-secondary-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board Card ⋯ Dropdown                                             */
/* ------------------------------------------------------------------ */

function CardDropdown({
  boardId,
  boardName,
  onRename,
  onDelete,
}: {
  boardId: string;
  boardName: string;
  onRename: (boardId: string) => void;
  onDelete: (boardId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'p-1 rounded-md text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors',
        )}
        aria-label={`Actions for ${boardName}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-border bg-card shadow-lg py-1"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onRename(boardId);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-secondary-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onDelete(boardId);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BoardList (main component)                                         */
/* ------------------------------------------------------------------ */

export function BoardList() {
  const { data: boards, isLoading, error: loadError } = useBoards();
  const deleteBoard = useDeleteBoard();
  // toast imported from lib/toast

  // Inline creation ghost-card state
  const [isCreating, setIsCreating] = useState(false);

  // Rename state (placeholder for future inline rename)
  const handleRename = (_boardId: string) => {
    // TODO: inline rename flow
    toast.info('Rename coming soon');
  };

  const handleDelete = (boardId: string) => {
    deleteBoard.mutate(boardId, {
      onSuccess: () => {
        toast.info('Board deleted');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="p-6" data-testid="loading">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <BoardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Error state ---- */
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load boards</h3>
          <p className="text-red-600 text-sm mb-4">{getErrorMessage(loadError)}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (!boards || boards.length === 0) {
    return (
      <div className="p-6 flex-1 overflow-y-auto" data-testid="board-list">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Start by creating your first board
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Boards help you organise tasks into columns. Give your board a name to get started.
          </p>
          <div className="w-full max-w-sm">
            <InlineCreateForm />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---- Board grid ---- */
  return (
    <div className="p-6 flex-1 overflow-y-auto" data-testid="board-list">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your Boards</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {boards.map((board, index) => {
          const isOptimistic = board.id.startsWith('temp-');
          const totalTodos =
            board.columns?.reduce((sum, col) => sum + (col.todos?.length ?? 0), 0) ?? 0;
          const sortedCols = [...(board.columns ?? [])].sort((a, b) => a.position - b.position);
          const doneTodos =
            sortedCols.length > 0
              ? (sortedCols[sortedCols.length - 1].todos?.length ?? 0)
              : 0;
          const percentage = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

          return (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Link
                to={`/board/${board.id}`}
                data-testid="board-card"
                className={cn(
                  'group relative block p-4 rounded-xl border border-border bg-card shadow-sm',
                  'hover:shadow-md hover:border-border transition-all',
                  // Mobile compact: horizontal layout
                  'sm:block',
                  isOptimistic && 'animate-pulse opacity-80',
                )}
              >
                {/* Top row: name + ⋯ */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{board.name}</h3>
                    {board.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  {!isOptimistic && (
                    <CardDropdown
                      boardId={board.id}
                      boardName={board.name}
                      onRename={handleRename}
                      onDelete={handleDelete}
                    />
                  )}
                </div>

                {/* Progress bar */}
                {totalTodos > 0 && (
                  <div className="mt-3" data-testid="progress-bar">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        {doneTodos}/{totalTodos} done
                      </span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Footer: meta */}
                <div
                  className="mt-4 flex items-center justify-between text-xs text-muted-foreground"
                  data-testid="todo-count"
                >
                  <span>
                    {board.columns?.length ?? 0}{' '}
                    {(board.columns?.length ?? 0) === 1 ? 'column' : 'columns'}
                    {' \u00b7 '}
                    {board.todoCount ?? 0} {(board.todoCount ?? 0) === 1 ? 'task' : 'tasks'}
                  </span>
                  {board.updatedAt && (
                    <span
                      className="inline-flex items-center gap-1"
                      title={new Date(board.updatedAt).toLocaleString()}
                    >
                      <Clock className="h-3 w-3" />
                      {relativeTime(board.updatedAt)}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Ghost card / inline creation */}
        <motion.div
          key="ghost-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: boards.length * 0.05, duration: 0.3 }}
        >
          {isCreating ? (
            <div
              className="p-4 rounded-xl border border-border bg-card shadow-sm"
              data-testid="ghost-card-form"
            >
              <InlineCreateForm onCancel={() => setIsCreating(false)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              data-testid="ghost-card"
              className={cn(
                'w-full h-full min-h-[120px] p-4 rounded-xl',
                'border-2 border-dashed border-border bg-transparent',
                'flex flex-col items-center justify-center gap-2',
                'text-muted-foreground hover:text-primary hover:border-primary',
                'transition-colors cursor-pointer',
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">+ New Board</span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
