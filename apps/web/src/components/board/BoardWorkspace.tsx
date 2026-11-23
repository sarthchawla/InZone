import type { RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Columns, Plus } from 'lucide-react';
import type { useBoardDnD } from '../../hooks/useBoardDnD';
import { cn } from '../../lib/utils';
import type { Board, Column, Todo } from '../../types';
import { BoardColumn } from '../column/BoardColumn';
import { TodoCard } from '../todo';
import { Button, Input } from '../ui';
import { DetailPanel } from './DetailPanel';

interface BoardWorkspaceProps {
  activeBoard: Board;
  activeColumnIndex: number;
  addingTodoColumnIds: Set<string>;
  boardDnD: ReturnType<typeof useBoardDnD>;
  boardId: string | undefined;
  deletingColumnIds: Set<string>;
  deletingTodoIds: Set<string>;
  isAddingColumn: boolean;
  isDraftInteractionDisabled: boolean;
  isImmediateActionDisabled: boolean;
  isMobile: boolean;
  isSavingNewColumn: boolean;
  newColumnName: string;
  scrollContainerRef: RefObject<HTMLDivElement>;
  selectedTodo: Todo | null;
  sortedColumns: Column[];
  onAddColumn: () => void;
  onAddTodo: (columnId: string, title: string) => void;
  onColumnKeyDown: (event: React.KeyboardEvent) => void;
  onDeleteColumn: (id: string) => void;
  onImmediateBoardCommit: (latestBoard: Board | undefined) => void;
  onSetIsAddingColumn: (isAdding: boolean) => void;
  onSetNewColumnName: (name: string) => void;
  onSetSelectedTodo: (todo: Todo | null) => void;
  onTodoClick: (todo: Todo) => void;
  onTodoContextMenu: (todo: Todo, event: React.MouseEvent) => void;
  onUpdateColumn: (id: string, updates: { name?: string; description?: string | null; wipLimit?: number | null }) => void;
}

export function BoardWorkspace({
  activeBoard,
  activeColumnIndex,
  addingTodoColumnIds,
  boardDnD,
  boardId,
  deletingColumnIds,
  deletingTodoIds,
  isAddingColumn,
  isDraftInteractionDisabled,
  isImmediateActionDisabled,
  isMobile,
  isSavingNewColumn,
  newColumnName,
  scrollContainerRef,
  selectedTodo,
  sortedColumns,
  onAddColumn,
  onAddTodo,
  onColumnKeyDown,
  onDeleteColumn,
  onImmediateBoardCommit,
  onSetIsAddingColumn,
  onSetNewColumnName,
  onSetSelectedTodo,
  onTodoClick,
  onTodoContextMenu,
  onUpdateColumn,
}: BoardWorkspaceProps) {
  const {
    activeId,
    activeTodo,
    activeColumn,
    overColumnId,
    overTodoId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = boardDnD;
  const columnIds = sortedColumns.map((column) => `column-${column.id}`);

  const addColumnForm = (
    <div className={cn(
      'flex flex-col gap-2 rounded-xl bg-stone-100 p-3',
      !isMobile && 'w-full md:w-72 md:min-w-72 h-fit'
    )}>
      <Input
        value={newColumnName}
        onChange={(event) => onSetNewColumnName(event.target.value)}
        onKeyDown={onColumnKeyDown}
        placeholder="Enter column name..."
        disabled={isImmediateActionDisabled}
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={onAddColumn}
          disabled={isImmediateActionDisabled}
          aria-busy={isSavingNewColumn}
        >
          {isSavingNewColumn ? 'Adding...' : 'Add'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isImmediateActionDisabled}
          onClick={() => {
            onSetIsAddingColumn(false);
            onSetNewColumnName('');
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 min-w-0',
          isMobile && 'column-scroll-container'
        )}
        data-testid="columns-container"
      >
        {sortedColumns.length === 0 && !isAddingColumn ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <Columns className="h-16 w-16 text-stone-300 mb-4" />
            <h3 className="text-xl font-medium text-stone-900 mb-2">Get started with your board</h3>
            <p className="text-stone-500 mb-6 max-w-md">
              Create your first column to begin organizing your tasks.
            </p>
            <Button variant="primary" onClick={() => onSetIsAddingColumn(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first column
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always,
              },
            }}
          >
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              <div className={cn('flex gap-4 h-full', isMobile && 'snap-x snap-mandatory')}>
                {sortedColumns.map((column, index) => (
                  <motion.div
                    key={column.id}
                    data-column-id={column.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    className={cn(isMobile && 'snap-center flex-shrink-0 w-full')}
                  >
                    <BoardColumn
                      column={column}
                      onAddTodo={onAddTodo}
                      onUpdateColumn={onUpdateColumn}
                      onDeleteColumn={onDeleteColumn}
                      onTodoClick={onTodoClick}
                      onTodoContextMenu={onTodoContextMenu}
                      isDragging={activeColumn?.id === column.id}
                      isDropTarget={overColumnId === column.id && activeTodo !== null}
                      activeTodoId={activeTodo?.id ?? null}
                      overTodoId={overColumnId === column.id ? overTodoId : null}
                      isColumnDragActive={activeColumn !== null}
                      disabled={isDraftInteractionDisabled}
                      immediateActionDisabled={isImmediateActionDisabled}
                      isAddingTodo={addingTodoColumnIds.has(column.id)}
                      isDeleting={deletingColumnIds.has(column.id)}
                      deletingTodoIds={deletingTodoIds}
                    />
                  </motion.div>
                ))}

                {!isMobile && (
                  <div>
                    {isAddingColumn ? addColumnForm : (
                      <button
                        onClick={() => onSetIsAddingColumn(true)}
                        disabled={isImmediateActionDisabled}
                        className="flex items-center gap-2 w-full md:w-72 md:min-w-72 h-fit p-3 rounded-xl bg-stone-200/50 hover:bg-stone-200 text-stone-500 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        Add column
                      </button>
                    )}
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
              sideEffects({ active }) {
                active.node.style.opacity = '0';
                return () => {
                  active.node.style.opacity = '';
                };
              },
            }}>
              {activeId && activeTodo ? (
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: 1.04, rotate: 2, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <TodoCard todo={activeTodo} isOverlay />
                </motion.div>
              ) : activeId && activeColumn ? (
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: 1.02, rotate: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col w-72 min-w-72 rounded-xl bg-white/95 backdrop-blur-sm shadow-2xl ring-2 ring-accent/30 cursor-grabbing"
                >
                  <div className="flex items-center justify-between p-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-700 uppercase tracking-wide text-xs">{activeColumn.name}</h3>
                      <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs text-accent font-medium">
                        {(activeColumn.todos ?? []).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-2 min-h-[60px] space-y-1.5 bg-stone-50/50 rounded-b-xl">
                    {(activeColumn.todos ?? []).slice(0, 3).map((todo) => (
                      <div key={todo.id} className="rounded-lg bg-white border border-stone-200 p-2 text-xs text-stone-600 truncate shadow-sm">
                        {todo.title}
                      </div>
                    ))}
                    {(activeColumn.todos ?? []).length > 3 && (
                      <div className="text-xs text-stone-400 text-center py-1">
                        +{(activeColumn.todos ?? []).length - 3} more
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {isMobile && (
        <div className="border-t border-stone-100 bg-white p-3">
          {isAddingColumn ? addColumnForm : (
            <button
              onClick={() => onSetIsAddingColumn(true)}
              disabled={isImmediateActionDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-100 px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add column
            </button>
          )}
        </div>
      )}

      {isMobile && sortedColumns.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2 bg-white border-t border-stone-100 safe-bottom">
          {sortedColumns.map((column, index) => (
            <button
              key={column.id}
              onClick={() => {
                scrollContainerRef.current?.scrollTo({
                  left: index * (scrollContainerRef.current?.clientWidth ?? 0),
                  behavior: 'smooth',
                });
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                index === activeColumnIndex
                  ? 'w-6 bg-accent'
                  : 'w-2 bg-stone-300 hover:bg-stone-400'
              )}
              aria-label={`Go to ${column.name}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedTodo && boardId && (
          <DetailPanel
            todo={selectedTodo}
            boardId={boardId}
            columns={activeBoard.columns}
            onCommitted={onImmediateBoardCommit}
            onClose={() => onSetSelectedTodo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
