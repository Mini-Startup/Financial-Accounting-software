'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to handle closing modals or floating containers when clicking outside.
 * Safely ignores clicks inside portaled menus, dropdowns, date pickers, toasts,
 * and ensures modals only close when the user actually clicks the backdrop overlay.
 */
export function useOutsideClickClose<T extends HTMLElement>(onClose: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const modal = containerRef.current;
      if (!modal) return;

      const target = event.target as Node | null;
      if (!target) return;

      // 1. If click is inside the modal itself, do not close
      if (modal.contains(target)) {
        return;
      }

      // 2. If click is inside any portal, floating element, dropdown, picker, or toast, do not close!
      if (target instanceof Element) {
        if (
          target.closest('[data-portal]') ||
          target.closest('[data-universal-dropdown]') ||
          target.closest('[data-universal-datepicker]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[role="dialog"]') ||
          target.closest('[role="menu"]') ||
          target.closest('[role="combobox"]') ||
          target.closest('[data-sonner-toaster]') ||
          target.closest('.modal-portal') ||
          target.closest('.dropdown-portal') ||
          target.closest('.portal-root')
        ) {
          return;
        }
      }

      // 3. Modals in this application are wrapped in fixed backdrop overlays (e.g. fixed inset-0).
      // Check if the modal has a backdrop parent.
      // If the click is in an arbitrary portaled element attached to document.body,
      // it won't be inside the backdrop overlay.
      const backdrop = modal.parentElement;
      if (backdrop && (backdrop.classList.contains('fixed') || backdrop.classList.contains('inset-0'))) {
        if (target !== backdrop && !backdrop.contains(target)) {
          return;
        }
      }

      // 4. If target is no longer connected to document (e.g., node was removed during click), do not close
      if (!document.contains(target)) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return containerRef;
}

