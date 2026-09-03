'use client';

import { useEffect, useRef } from 'react';

export function useOutsideClickClose<T extends HTMLElement>(onClose: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [onClose]);

  return containerRef;
}

