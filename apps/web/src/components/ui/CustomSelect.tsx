'use client';

import { useState, useEffect, useRef, useLayoutEffect, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Plus, ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: 'buy' | 'sell' | 'neutral' | 'accent';
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  options: Array<SelectOption<T> | T>;
  onChange: (newValue: T) => void;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'subtle' | 'badge' | 'table-cell';
  align?: 'left' | 'right';
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuWidth?: number;
  onAddClick?: () => void;
  addLabel?: string;
  id?: string;
  'aria-label'?: string;
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  openUpward: boolean;
}

export function CustomSelect<T extends string | number = string>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  size = 'sm',
  variant = 'default',
  align = 'left',
  searchable,
  disabled = false,
  className,
  triggerClassName,
  menuWidth,
  onAddClick,
  addLabel = 'Add New',
  id,
  'aria-label': ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState<Coords | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption<T>[] = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt as SelectOption<T>;
    }
    return {
      value: opt as T,
      label: String(opt),
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value).toUpperCase() === String(value).toUpperCase()
  );

  // Enable search automatically if there are many options (>8) and not explicitly disabled
  const isSearchable = searchable ?? (normalizedOptions.length > 8 && size !== 'xs');

  // Filter options if searching
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      String(opt.value).toLowerCase().includes(q)
    );
  });

  // Calculate viewport-aware fixed coordinates
  const calculateCoords = (): Coords | null => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();

    const approxMenuHeight = Math.min(260, Math.max(80, filteredOptions.length * 36 + (isSearchable ? 44 : 10)));
    const targetWidth = menuWidth || Math.max(rect.width, size === 'xs' ? 90 : 140);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < approxMenuHeight && spaceAbove > spaceBelow;

    let left = align === 'right' ? rect.right - targetWidth : rect.left;

    // Viewport clamp
    if (left + targetWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - targetWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    if (openUpward) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: targetWidth,
        openUpward: true,
      };
    }

    return {
      top: rect.bottom + 4,
      left,
      width: targetWidth,
      openUpward: false,
    };
  };

  const openDropdown = () => {
    if (disabled) return;
    const initialCoords = calculateCoords();
    if (initialCoords) {
      setCoords(initialCoords);
    }
    setIsOpen(true);
    setSearchQuery('');
    setHighlightedIndex(-1);
    if (isSearchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;

    const handleScrollResize = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const approxMenuHeight = Math.min(260, Math.max(80, filteredOptions.length * 36 + (isSearchable ? 44 : 10)));
      const targetWidth = menuWidth || Math.max(rect.width, size === 'xs' ? 90 : 140);

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < approxMenuHeight && spaceAbove > spaceBelow;

      let left = align === 'right' ? rect.right - targetWidth : rect.left;
      if (left + targetWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - targetWidth - 12);
      }
      if (left < 12) {
        left = 12;
      }

      setCoords(
        openUpward
          ? {
              bottom: window.innerHeight - rect.top + 4,
              left,
              width: targetWidth,
              openUpward: true,
            }
          : {
              top: rect.bottom + 4,
              left,
              width: targetWidth,
              openUpward: false,
            }
      );
    };

    window.addEventListener('resize', handleScrollResize);
    window.addEventListener('scroll', handleScrollResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollResize);
      window.removeEventListener('scroll', handleScrollResize, true);
    };
  }, [isOpen, align, filteredOptions.length, isSearchable, menuWidth, size]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: T) => {
    onChange(val);
    closeDropdown();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      closeDropdown();
    }
  };

  // Sizing styles
  const sizeStyles = {
    xs: 'h-7 px-2 text-[11px] font-mono gap-1',
    sm: 'h-8 px-2.5 text-xs font-medium gap-1.5',
    md: 'h-10 px-3 text-sm font-medium gap-2',
  }[size];

  // Variant styling
  const variantStyles = {
    default:
      'bg-white border border-[var(--color-border-medium)] text-[var(--color-charcoal)] hover:border-[var(--color-border-focus)] shadow-2xs',
    subtle:
      'bg-[var(--color-snow)] border border-[var(--color-border-light)] text-[var(--color-charcoal)] hover:bg-[var(--color-mist)]/50',
    badge:
      'bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-200 font-semibold',
    'table-cell':
      'bg-transparent border border-transparent hover:border-slate-300 hover:bg-white text-[var(--color-charcoal)]',
  }[variant];

  // Helper for direction styling
  const renderValueBadge = () => {
    const valStr = String(value).toUpperCase();
    if (valStr === 'BUY') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{selectedOption?.label || 'BUY'}</span>
        </span>
      );
    }
    if (valStr === 'SELL') {
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>{selectedOption?.label || 'SELL'}</span>
        </span>
      );
    }
    if (valStr === 'BOTH') {
      return (
        <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>{selectedOption?.label || 'Both'}</span>
        </span>
      );
    }
    return selectedOption ? selectedOption.label : placeholder;
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center', className)}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (typeof placeholder === 'string' ? placeholder : undefined)}
        className={cn(
          'inline-flex items-center justify-between rounded-[var(--radius-md)] transition-all duration-150 select-none outline-none cursor-pointer',
          sizeStyles,
          variantStyles,
          isOpen && 'border-[var(--color-border-focus)] ring-2 ring-[var(--color-leaf)]/20 shadow-xs',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none bg-slate-100',
          triggerClassName
        )}
      >
        <span className="truncate text-left flex items-center">
          {renderValueBadge()}
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-[var(--color-slate)] transition-transform duration-200 pointer-events-none',
            size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5',
            isOpen && 'rotate-180 text-[var(--color-forest)]'
          )}
        />
      </button>

      {/* Floating Menu via Portal */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            data-portal="custom-select"
            data-custom-select="true"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              ...(coords.openUpward
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className="bg-white border border-[var(--color-border-light)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col duration-150 animate-in fade-in zoom-in-95"
          >
            {/* Optional search header */}
            {isSearchable && (
              <div className="p-1.5 border-b border-[var(--color-border-light)] bg-[var(--color-snow)] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[var(--color-slate)] shrink-0 ml-1" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Filter..."
                  className="w-full bg-transparent text-xs text-[var(--color-charcoal)] outline-none placeholder:text-[var(--color-fog)] py-0.5"
                />
              </div>
            )}

            {/* Options list */}
            <div
              role="listbox"
              tabIndex={-1}
              className="overflow-y-auto max-h-56 py-1 divide-y divide-slate-50 outline-none"
            >
              {filteredOptions.length === 0 ? (
                <div className="py-2.5 px-3 text-center text-xs text-[var(--color-slate)] italic">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected =
                    String(opt.value).toUpperCase() === String(value).toUpperCase();
                  const isHighlighted = idx === highlightedIndex;

                  const optStr = String(opt.value).toUpperCase();
                  const isBuy = optStr === 'BUY';
                  const isSell = optStr === 'SELL';
                  const isBoth = optStr === 'BOTH';

                  return (
                    <div
                      key={`${String(opt.value)}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer select-none transition-colors duration-100',
                        isSelected &&
                          'bg-[var(--color-mist)] text-[var(--color-forest)] font-semibold',
                        !isSelected &&
                          isHighlighted &&
                          'bg-[var(--color-snow)] text-[var(--color-charcoal)]',
                        !isSelected && !isHighlighted && 'text-[var(--color-charcoal)]'
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        {isBuy && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        {isSell && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                        {isBoth && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                        <div className="flex flex-col truncate">
                          <span
                            className={cn(
                              'truncate',
                              isBuy && 'text-emerald-700 font-semibold',
                              isSell && 'text-rose-700 font-semibold',
                              isBoth && 'text-indigo-700 font-medium'
                            )}
                          >
                            {opt.label}
                          </span>
                          {opt.sublabel && (
                            <span className="text-[10px] text-[var(--color-slate)] truncate">
                              {opt.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--color-leaf)] shrink-0 font-bold" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Optional Add New action */}
            {onAddClick && (
              <div className="border-t border-[var(--color-border-light)] p-1 bg-[var(--color-snow)] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    closeDropdown();
                    onAddClick();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold text-[var(--color-forest)] hover:bg-[var(--color-mist)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{addLabel}</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
