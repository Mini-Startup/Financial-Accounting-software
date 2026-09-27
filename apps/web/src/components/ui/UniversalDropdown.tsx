'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Plus, ChevronDown, Check, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface UniversalDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  id?: string;
  title?: string;
}

export function UniversalDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  disabled = false,
  clearable = false,
  onAddClick,
  addLabel = 'Add New',
  id,
  title,
}: UniversalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      opt.value.toLowerCase().includes(q)
    );
  });

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      setHighlightedIndex(-1);
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
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
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', disabled && 'opacity-60 cursor-not-allowed', className)}
      title={title}
    >
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full min-h-[38px] px-3 py-1.5 bg-white border border-[var(--color-border-medium)] rounded-[var(--radius-md)] text-xs text-[var(--color-charcoal)]',
          'flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 select-none shadow-xs',
          isOpen && 'border-[var(--color-border-focus)] ring-2 ring-[var(--color-leaf)]/20',
          !disabled && 'hover:border-[var(--color-slate)]'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-[var(--color-fog)]')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 text-[var(--color-slate)]">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-[var(--color-negative)] transition-colors rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, 180)}px`,
              zIndex: 99999,
            }}
            className="bg-white border border-[var(--color-border-light)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Input Header */}
            <div className="p-2 border-b border-[var(--color-border-light)] bg-[var(--color-snow)]">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[var(--color-border-medium)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-border-focus)] text-[var(--color-charcoal)] placeholder:text-[var(--color-fog)]"
              />
            </div>

            {/* Options List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--color-slate)]">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'px-3 py-2 text-xs flex items-center justify-between cursor-pointer select-none transition-colors',
                        isSelected && 'bg-[var(--color-mist)] text-[var(--color-forest)] font-semibold',
                        !isSelected && isHighlighted && 'bg-[var(--color-snow)] text-[var(--color-charcoal)]',
                        !isSelected && !isHighlighted && 'text-[var(--color-charcoal)]'
                      )}
                    >
                      <div className="flex flex-col truncate mr-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-[var(--color-slate)] truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--color-leaf)] shrink-0 font-bold" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Button Footer */}
            {onAddClick && (
              <div className="border-t border-[var(--color-border-light)] p-1.5 bg-[var(--color-snow)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSearchQuery('');
                    onAddClick();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-[var(--color-forest)] hover:bg-[var(--color-mist)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
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
