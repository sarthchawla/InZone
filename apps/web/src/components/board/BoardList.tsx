import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Layout } from 'lucide-react';
import { useBoards, useCreateBoard, useDeleteBoard, useTemplates } from '../../hooks/useBoards';
import { Button, Input, Modal } from '../ui';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';

export function BoardList() {
  const { data: boards, isLoading, error: loadError } = useBoards();
  const { data: templates } = useTemplates();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  const toast = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      setCreateError(null);
      createBoard.mutate(
        {
          name: newBoardName.trim(),
          description: newBoardDescription.trim() || undefined,
          templateId: selectedTemplate || undefined,
        },
        {
          onSuccess: () => {
            setIsCreateModalOpen(false);
            setNewBoardName('');
            setNewBoardDescription('');
            setSelectedTemplate('');
            toast.success('Board created successfully');
          },
          onError: (error) => {
            const message = getErrorMessage(error);
            setCreateError(message);
          },
        }
      );
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError(null);
    setNewBoardName('');
    setNewBoardDescription('');
    setSelectedTemplate('');
  };

  const handleDeleteBoard = (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board?')) {
      deleteBoard.mutate(boardId, {
        onSuccess: () => {
          toast.success('Board deleted');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load boards</h3>
          <p className="text-red-600 text-sm">{getErrorMessage(loadError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Boards</h2>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/board/${board.id}`}
              className="group relative block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Layout className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{board.name}</h3>
                    {board.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteBoard(e, board.id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-400">
                {board.columns?.length ?? 0} columns
                {' · '}
                {board.todoCount ?? 0} tasks
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Layout className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
          <p className="text-gray-500 mb-4">Create your first board to get started</p>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        </div>
      )}

      {/* Create Board Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Create New Board"
      >
        <div className="space-y-4">
          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board Name *
            </label>
            <Input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Enter board name..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No template (empty board)</option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateBoard}
              disabled={!newBoardName.trim() || createBoard.isPending}
            >
              {createBoard.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
