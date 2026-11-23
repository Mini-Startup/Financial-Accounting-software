'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDebouncedAction } from '@/hooks/useDebouncedAction';

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  debounceMs?: number;
  icon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ActionButtonProps['variant']>, string> = {
  primary: 'bg-[#2652C8] hover:bg-[#1F42A3] text-white border-transparent shadow-xs active:bg-[#1C3782]',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs active:bg-slate-100',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-xs active:bg-rose-800',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs active:bg-emerald-800',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent active:bg-slate-200',
  outline: 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100',
};

const sizeStyles: Record<NonNullable<ActionButtonProps['size']>, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-xs font-semibold gap-2',
  lg: 'h-10 px-4 text-sm font-semibold gap-2',
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      debounceMs = 400,
      icon,
      disabled,
      onClick,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    // If an onClick is provided, automatically wrap with useDebouncedAction
    const [debouncedClick, isActionPending] = useDebouncedAction(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
          await onClick(e);
        }
      },
      debounceMs
    );

    const isBusy = isLoading || isActionPending;
    const isDisabled = disabled || isBusy;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        onClick={onClick ? debouncedClick : undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-lg border font-medium select-none cursor-pointer',
          'transition-all duration-150 ease-out',
          'hover:-translate-y-0.5 hover:shadow-sm',
          'active:scale-[0.98] active:translate-y-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...rest}
      >
        {isBusy ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

ActionButton.displayName = 'ActionButton';
