'use client';

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
          <svg
            viewBox="0 0 16 16"
            className="w-3 h-3 fill-none stroke-current stroke-[2.4] shrink-0"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        )}
      </div>
      {label && <span className="text-charcoal">{label}</span>}
    </label>
  );
}
