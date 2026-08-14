'use client';

import { useEffect } from 'react';

let lockCount = 0;

/**
 * Custom hook to lock body scrolling when modals, drawers, or slide-outs are open.
 * Uses a reference counter so nested sub-modals keep scrolling locked until all modals are closed.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      lockCount++;
      document.body.style.overflow = 'hidden';
      return () => {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          document.body.style.overflow = '';
        }
      };
    }
  }, [isLocked]);
}
