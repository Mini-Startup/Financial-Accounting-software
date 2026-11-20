'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to debounce button actions and lock async executions to prevent double-submits.
 * 
 * @param action Async or sync function to execute on click
 * @param debounceMs Minimum milliseconds between allowed click invocations (default 400ms)
 * @returns [wrappedAction, isPending]
 */
export function useDebouncedAction<T extends (...args: any[]) => any>(
  action: T,
  debounceMs = 400
): [(...args: Parameters<T>) => Promise<ReturnType<T> | void>, boolean] {
  const [isPending, setIsPending] = useState(false);
  const isExecutingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const debouncedAction = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
      const now = Date.now();
      // Block if action is currently executing or called too rapidly
      if (isExecutingRef.current || now - lastCallTimeRef.current < debounceMs) {
        return;
      }

      lastCallTimeRef.current = now;
      isExecutingRef.current = true;
      setIsPending(true);

      try {
        const result = await actionRef.current(...args);
        return result;
      } finally {
        isExecutingRef.current = false;
        setIsPending(false);
      }
    },
    [debounceMs]
  );

  return [debouncedAction, isPending];
}
