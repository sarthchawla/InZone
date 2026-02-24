import { useState, useCallback } from 'react';

export function useColumnCollapse(boardId: string) {
  const storageKey = `inzone-board-${boardId}-collapsed-columns`;

  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const toggleCollapse = useCallback((columnId: string) => {
    setCollapsedColumns(prev => {
      const next = prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const isCollapsed = useCallback((columnId: string) => collapsedColumns.includes(columnId), [collapsedColumns]);

  return { collapsedColumns, toggleCollapse, isCollapsed };
}
