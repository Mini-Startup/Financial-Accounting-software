'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
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
  triggerClassName?: string;
  searchable?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  id?: string;
  title?: string;
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  openUpward: boolean;
}

export function UniversalDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  triggerClassName,
  searchable = true,
  disabled = false,
  clearable = false,
  onAddClick,
  addLabel = 'Add New',
  id,
  title,
}: UniversalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<Coords | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(selectedOption ? selectedOption.label : '');
    setSearchQuery('');
  }

  // Filter options based on typable search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      opt.value.toLowerCase().includes(q)
    );
  });

  // Calculate coordinates with space collision detection (flip upward if close to bottom)
  const calculateCoords = useCallback((): Coords | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();

    const menuEstimatedHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow;

    const minWidth = Math.max(rect.width, 180);
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - minWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    if (openUpward) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: minWidth,
        openUpward: true,
      };
    }

    return {
      top: rect.bottom + 4,
      left,
      width: minWidth,
      openUpward: false,
    };
  }, []);

  const updateCoords = useCallback(() => {
    const newCoords = calculateCoords();
    if (newCoords) {
      setCoords(newCoords);
    }
  }, [calculateCoords]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setInputValue(selectedOption ? selectedOption.label : '');
  }, [selectedOption]);

  const openDropdown = () => {
    if (disabled) return;
    const initialCoords = calculateCoords();
    if (initialCoords) {
      setCoords(initialCoords);
    }
    setIsOpen(true);
    setSearchQuery('');
    setHighlightedIndex(-1);
    // Focus the input so the user can immediately type
    setTimeout(() => {
      inputRef.current?.select();
    }, 10);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Re-calculate coords on scroll or window resize
  useLayoutEffect(() => {
    if (isOpen) {
      const handleScrollResize = () => updateCoords();
      window.addEventListener('resize', handleScrollResize);
      window.addEventListener('scroll', handleScrollResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollResize);
        window.removeEventListener('scroll', handleScrollResize, true);
      };
    }
  }, [isOpen, updateCoords]);

  // Handle outside click
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
  }, [isOpen, closeDropdown]);

  const handleSelect = (val: string) => {
    onChange(val);
    const chosen = options.find((o) => o.value === val);
    setInputValue(chosen ? chosen.label : '');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
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
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value);
      } else {
        closeDropdown();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === 'Tab') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (searchQuery.trim() && filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value);
      } else {
        closeDropdown();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', disabled && 'opacity-60 cursor-not-allowed', className)}
      title={title}
    >
      <div
        className={cn(
          'w-full min-h-[38px] px-2.5 py-1 bg-white border border-[var(--color-border-medium)] rounded-[var(--radius-md)] text-xs text-[var(--color-charcoal)]',
          'flex items-center justify-between gap-1.5 transition-all duration-150 select-none shadow-xs',
          searchable ? 'cursor-text' : 'cursor-pointer',
          isOpen && 'border-[var(--color-border-focus)] ring-2 ring-[var(--color-leaf)]/20',
          !disabled && 'hover:border-[var(--color-slate)]',
          triggerClassName
        )}
        onClick={() => {
          if (disabled) return;
          if (!searchable) {
            handleToggle();
          } else {
            if (!isOpen) {
              openDropdown();
            } else {
              inputRef.current?.focus();
            }
          }
        }}
      >
        {/* Main Typable Search / Display Input or static label */}
        {searchable ? (
          <input
            ref={inputRef}
            id={id}
            type="text"
            disabled={disabled}
            value={isOpen ? inputValue : selectedOption ? selectedOption.label : ''}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            onChange={(e) => {
              setInputValue(e.target.value);
              setSearchQuery(e.target.value);
              setHighlightedIndex(0);
              if (!isOpen) {
                openDropdown();
              }
            }}
            onFocus={() => {
              if (!isOpen) {
                openDropdown();
              }
            }}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent text-xs text-[var(--color-charcoal)] placeholder:text-[var(--color-fog)] outline-none cursor-text truncate"
          />
        ) : (
          <span className="w-full text-xs text-[var(--color-charcoal)] truncate select-none">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}

        {/* Right side controls: Clear (X) & Chevron Toggle */}
        <div className="flex items-center gap-1 shrink-0 text-[var(--color-slate)]">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setInputValue('');
                setSearchQuery('');
                closeDropdown();
              }}
              className="p-1 hover:text-[var(--color-negative)] transition-colors rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="p-1 hover:text-[var(--color-charcoal)] transition-colors rounded cursor-pointer"
            title={isOpen ? 'Close' : 'Open'}
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isOpen && 'rotate-180 text-[var(--color-forest)]'
              )}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Menu Portal */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            data-portal="dropdown"
            data-universal-dropdown="true"
            onMouseDown={(e) => {
              // Prevent mousedown from bubbling to parent backdrop / outside click listeners
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{
              position: 'fixed',
              ...(coords.openUpward
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className="bg-white border border-[var(--color-border-light)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-60 duration-100"
          >
            {/* Options List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--color-slate)] italic">
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
              <div className="border-t border-[var(--color-border-light)] p-1.5 bg-[var(--color-snow)] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    closeDropdown();
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
