'use client';

import { useEffect } from 'react';

export function useUnsavedChangesWarning(enabled: boolean, message: string) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = message;
      return message;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      if (link.target && link.target !== '_self') {
        return;
      }

      if (link.hasAttribute('download')) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);
      if (nextUrl.href === window.location.href) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [enabled, message]);
}
