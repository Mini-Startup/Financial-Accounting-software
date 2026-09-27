'use client';

import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CustomCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  className,
  id,
}: CustomCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-2 select-none cursor-pointer text-xs font-medium text-[var(--color-charcoal)]',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          if (!disabled) {
            onChange(e.target.checked);
          }
        }}
        className="sr-only"
      />
      <div
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer',
          checked
            ? 'bg-[var(--color-leaf)] border-[var(--color-leaf)] text-white shadow-2xs'
            : 'bg-white border-[var(--color-border-medium)] hover:border-[var(--color-border-focus)]'
        )}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
      {label && <span className="text-[var(--color-charcoal)]">{label}</span>}
    </label>
  );
}
