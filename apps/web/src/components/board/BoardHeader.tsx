import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, RotateCcw, Save, Tags } from 'lucide-react';
import type { SyncState } from '../../hooks/useSyncStatus';
import type { Board } from '../../types';
import { Button, RichTextEditor, SyncStatusIndicator } from '../ui';

interface BoardHeaderProps {
  activeBoard: Board;
  boardNameInputRef: RefObject<HTMLInputElement>;
  boardSaveError: string | null;
  editedBoardName: string;
  editedDescription: string;
  hasBoardChanges: boolean;
  isEditingBoardName: boolean;
  isEditingDescription: boolean;
  isSavingBoardDraft: boolean;
  pendingCount: number;
  syncState: SyncState;
  onBoardNameClick: () => void;
  onBoardNameKeyDown: (event: React.KeyboardEvent) => void;
  onBoardNameSave: () => void;
  onDescriptionBlur: () => void;
  onDiscardBoardChanges: () => void;
  onSaveBoardChanges: () => void;
  onSetEditedBoardName: (name: string) => void;
  onSetEditedDescription: (description: string) => void;
  onSetEditingDescription: (isEditing: boolean) => void;
  onShowLabelManager: () => void;
}

export function BoardHeader({
  activeBoard,
  boardNameInputRef,
  boardSaveError,
  editedBoardName,
  editedDescription,
  hasBoardChanges,
  isEditingBoardName,
  isEditingDescription,
  isSavingBoardDraft,
  pendingCount,
  syncState,
  onBoardNameClick,
  onBoardNameKeyDown,
  onBoardNameSave,
  onDescriptionBlur,
  onDiscardBoardChanges,
  onSaveBoardChanges,
  onSetEditedBoardName,
  onSetEditedDescription,
  onSetEditingDescription,
  onShowLabelManager,
}: BoardHeaderProps) {
  return (
    <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link
            to="/"
            data-testid="back-to-boards"
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg flex-shrink-0 transition-colors"
            title="Back to boards"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              {isEditingBoardName ? (
                <input
                  ref={boardNameInputRef}
                  type="text"
                  value={editedBoardName}
                  disabled={isSavingBoardDraft}
                  onChange={(event) => onSetEditedBoardName(event.target.value)}
                  onBlur={onBoardNameSave}
                  onKeyDown={onBoardNameKeyDown}
                  className="text-lg sm:text-xl font-bold text-stone-900 bg-white border border-accent rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-accent/30 min-w-[120px] sm:min-w-[200px] max-w-full"
                />
              ) : (
                <h1
                  className="text-lg sm:text-xl font-bold text-stone-900 cursor-pointer hover:text-accent truncate transition-colors"
                  onClick={onBoardNameClick}
                  title="Click to edit"
                >
                  {activeBoard.name}
                </h1>
              )}
            </div>
            {isEditingDescription ? (
              <div
                className="max-w-xl"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    onDescriptionBlur();
                  }
                }}
              >
                <RichTextEditor
                  content={editedDescription}
                  onChange={onSetEditedDescription}
                  placeholder="Add a description..."
                  editable={!isSavingBoardDraft}
                  compact
                />
              </div>
            ) : (
              <p
                className="text-xs text-stone-400 truncate cursor-pointer hover:text-stone-600 transition-colors max-w-xl"
                onClick={() => {
                  onSetEditedDescription(activeBoard.description || '');
                  onSetEditingDescription(true);
                }}
                title={activeBoard.description || 'Click to add description'}
              >
                {activeBoard.description || 'Add a description...'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <SyncStatusIndicator state={syncState} pendingCount={pendingCount} />
          <AnimatePresence>
            {hasBoardChanges && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1.5"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDiscardBoardChanges}
                  disabled={isSavingBoardDraft}
                  aria-label="Discard changes"
                  title="Discard changes"
                >
                  <RotateCcw className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Discard</span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onSaveBoardChanges}
                  disabled={isSavingBoardDraft}
                  aria-busy={isSavingBoardDraft}
                  aria-label={isSavingBoardDraft ? 'Saving changes' : 'Save changes'}
                  title={isSavingBoardDraft ? 'Saving changes' : 'Save changes'}
                >
                  {isSavingBoardDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  <span>{isSavingBoardDraft ? 'Saving...' : 'Save changes'}</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowLabelManager}
            disabled={isSavingBoardDraft}
            aria-label="Labels"
            title="Manage labels"
          >
            <Tags className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Labels</span>
          </Button>
        </div>
      </div>
      {boardSaveError && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {boardSaveError}
        </p>
      )}
    </div>
  );
}
