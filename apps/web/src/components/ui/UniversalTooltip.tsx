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
  delayMs = 450,
  closeDelayMs = 0,
  className,
  disabled = false,
}: UniversalTooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <Tooltip delay={delayMs} closeDelay={closeDelayMs}>
      <TooltipTrigger className="inline-flex items-center">
        {children}
      </TooltipTrigger>
      <TooltipContent
        showArrow
        placement={side}
        style={{ '--tooltip-arrow-fill': '#0A1B4D' } as React.CSSProperties}
        className={cn(
          'text-xs font-medium py-1 px-2.5 rounded-lg bg-[#0A1B4D] text-white shadow-xl border border-white/10 select-none z-50',
          className
        )}
      >
        <TooltipArrow className="text-[#0A1B4D] fill-[#0A1B4D] [&_svg]:fill-[#0A1B4D]! [&_svg]:stroke-transparent! [&_path]:fill-[#0A1B4D]!">
          <svg
            data-slot="overlay-arrow"
            fill="#0A1B4D"
            height="12"
            viewBox="0 0 12 12"
            width="12"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fill="#0A1B4D" d="M0 0C5.48483 8 6.5 8 12 0Z" />
          </svg>
        </TooltipArrow>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
