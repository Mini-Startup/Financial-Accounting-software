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
        'inline-flex items-center gap-2 select-none cursor-pointer text-xs font-medium text-slate-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 shrink-0',
          checked
            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
            : 'bg-white border-slate-300 hover:border-slate-400'
        )}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
      {label && <span>{label}</span>}
    </label>
  );
}
