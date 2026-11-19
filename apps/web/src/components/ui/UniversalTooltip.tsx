'use client';

import React, { ReactNode } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow } from '@heroui/react';
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

export function UniversalTooltip({
  content,
  children,
  side = 'top',
  delayMs = 600,
  closeDelayMs = 0,
  className,
  disabled = false,
}: UniversalTooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <Tooltip delay={delayMs} closeDelay={closeDelayMs} shouldSkipAnimation={true}>
      <TooltipTrigger className="inline-flex items-center">
        {children}
      </TooltipTrigger>
      <TooltipContent
        showArrow={false}
        placement={side}
        style={{ '--overlay': '#0A1B4D' } as React.CSSProperties}
        className={cn(
          'text-xs font-medium py-1 px-2.5 rounded-lg! bg-[#0A1B4D]! text-white! shadow-xl border border-white/10 select-none z-50 relative pointer-events-none',
          className
        )}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
