import { useCallback, useEffect, useState } from 'react';
import { useBeforeUnload, useNavigate } from 'react-router-dom';

interface UseUnsavedBoardNavigationArgs {
  message: string;
  shouldWarn: boolean;
}

export function useUnsavedBoardNavigation({ message, shouldWarn }: UseUnsavedBoardNavigationArgs) {
  const navigate = useNavigate();
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  useBeforeUnload(
    useCallback((event) => {
      if (!shouldWarn) return;
      event.preventDefault();
      event.returnValue = message;
    }, [message, shouldWarn])
  );

  useEffect(() => {
    if (!shouldWarn) return;

    const handleInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null;
      if (!target || (target.target && target.target !== '_self')) return;

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      if (currentPath === nextPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationPath(nextPath);
    };

    document.addEventListener('click', handleInternalNavigation, true);
    return () => {
      document.removeEventListener('click', handleInternalNavigation, true);
    };
  }, [shouldWarn]);

  const stayOnBoard = () => {
    setPendingNavigationPath(null);
  };

  const leaveWithoutSaving = () => {
    if (!pendingNavigationPath) return;
    const nextPath = pendingNavigationPath;
    setPendingNavigationPath(null);
    navigate(nextPath);
  };

  return {
    leaveWithoutSaving,
    pendingNavigationPath,
    stayOnBoard,
  };
}
