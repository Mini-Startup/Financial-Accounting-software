'use client';

import React, { useState, useRef, useEffect, useId, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export interface UniversalTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  closeDelayMs?: number;
  className?: string;
  disabled?: boolean;
}

// Global active tooltip singleton: ensures ONLY ONE tooltip is EVER visible on screen at once
let globalActiveTooltipId: string | null = null;
const activeListeners = new Set<(activeId: string | null) => void>();

function setActiveTooltip(id: string | null) {
  globalActiveTooltipId = id;
  activeListeners.forEach((fn) => fn(id));
}

export function UniversalTooltip({
  content,
  children,
  side = 'top',
  delayMs = 400,
  closeDelayMs = 0,
  className,
  disabled = false,
}: UniversalTooltipProps) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to global active singleton
  useEffect(() => {
    const handleActiveChange = (activeId: string | null) => {
      if (activeId !== tooltipId) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    activeListeners.add(handleActiveChange);
    return () => {
      activeListeners.delete(handleActiveChange);
    };
  }, [tooltipId]);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (side) {
      case 'top':
        top = rect.top - 7;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 7;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 7;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 7;
        break;
    }

    setCoords({ top, left });
  }, [side]);

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
    // Cancel any other pending enter timer
    if (globalActiveTooltipId && globalActiveTooltipId !== tooltipId) {
      setActiveTooltip(null);
    }
    enterTimeoutRef.current = setTimeout(() => {
      updateCoords();
      setActiveTooltip(tooltipId);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (closeDelayMs <= 0) {
      if (globalActiveTooltipId === tooltipId) {
        setActiveTooltip(null);
      }
    } else {
      exitTimeoutRef.current = setTimeout(() => {
        if (globalActiveTooltipId === tooltipId) {
          setActiveTooltip(null);
        }
      }, closeDelayMs);
    }
  };

  // Close instantly on scroll, resize, or unmount
  useEffect(() => {
    const handleDismiss = () => {
      if (globalActiveTooltipId === tooltipId) {
        setActiveTooltip(null);
      }
    };
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
      if (globalActiveTooltipId === tooltipId) {
        setActiveTooltip(null);
      }
    };
  }, [tooltipId]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const transformStyle =
    side === 'top'
      ? 'translate(-50%, -100%)'
      : side === 'bottom'
      ? 'translate(-50%, 0)'
      : side === 'left'
      ? 'translate(-100%, -50%)'
      : 'translate(0, -50%)';

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

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: transformStyle,
              zIndex: 9999999,
            }}
            role="tooltip"
            className={cn(
              'pointer-events-none select-none bg-[#0A1B4D] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl border border-white/10 whitespace-nowrap backdrop-blur-md relative',
              'animate-in fade-in zoom-in-95 duration-100 ease-out',
              className
            )}
          >
            {/* Tooltip Arrow: Exact matching dark navy color (#0A1B4D) - never white! */}
            {side === 'top' && (
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none"
                style={{
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '5px solid #0A1B4D',
                }}
              />
            )}
            {side === 'bottom' && (
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none"
                style={{
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: '5px solid #0A1B4D',
                }}
              />
            )}
            {side === 'left' && (
              <div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none"
                style={{
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: '5px solid #0A1B4D',
                }}
              />
            )}
            {side === 'right' && (
              <div
                className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none"
                style={{
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderRight: '5px solid #0A1B4D',
                }}
              />
            )}

            {content}
          </div>,
          document.body
        )}
    </>
  );
}
