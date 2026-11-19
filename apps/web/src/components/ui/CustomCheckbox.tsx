'use client';

import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

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
        'inline-flex items-center gap-2 select-none cursor-pointer text-xs font-medium text-charcoal',
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
        className="sr-only peer"
      />
      <div
        className={cn(
          'w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer overflow-hidden leading-none',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1',
          checked
            ? 'bg-[#2652C8] border-[#2652C8] text-white shadow-xs'
            : 'bg-white border-slate-300 hover:border-blue-500'
        )}
      >
        {checked && (
          <Check className="w-2.5 h-2.5 text-white stroke-[3] shrink-0" />
        )}
      </div>
      {label && <span className="text-charcoal">{label}</span>}
    </label>
  );
}
