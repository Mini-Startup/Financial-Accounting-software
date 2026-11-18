'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export interface UniversalTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  className?: string;
  disabled?: boolean;
}

export function UniversalTooltip({
  content,
  children,
  side = 'top',
  delayMs = 120,
  className,
  disabled = false,
}: UniversalTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (side) {
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    timeoutRef.current = setTimeout(() => {
      calculateCoords();
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className="inline-flex items-center"
      >
        {children}
      </div>

      {isVisible &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform:
                side === 'top'
                  ? 'translate(-50%, -100%)'
                  : side === 'bottom'
                  ? 'translate(-50%, 0)'
                  : side === 'left'
                  ? 'translate(-100%, -50%)'
                  : 'translate(0, -50%)',
              zIndex: 9999999,
            }}
            className={cn(
              'pointer-events-none select-none bg-[#0A1B4D] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl border border-white/15 whitespace-nowrap backdrop-blur-md',
              'animate-in fade-in zoom-in-95 duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
