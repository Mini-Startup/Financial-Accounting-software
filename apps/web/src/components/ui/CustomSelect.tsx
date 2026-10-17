'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Plus, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (newValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onAddClick?: () => void;
  addLabel?: string;
  required?: boolean;
  name?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  className,
  onAddClick,
  addLabel = 'Add New',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(
    (opt) => opt.value.toUpperCase() === (value || '').toUpperCase()
  );
  const selectedLabel = selectedOption ? selectedOption.label : value || '';

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!isTyping) {
      setSearchQuery(selectedLabel);
    }
  }

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

  const handleOpen = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
    setIsTyping(false);
    setSearchQuery(''); // Reset search text to show all options
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
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
        setIsTyping(false);
        setSearchQuery(selectedLabel);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, selectedLabel]);

  // Filter options based on input text if typing
  const filteredOptions = isTyping && searchQuery.trim() !== ''
    ? options.filter(
        (opt) =>
          opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setIsTyping(false);
    const chosen = options.find((opt) => opt.value === val);
    setSearchQuery(chosen ? chosen.label : val);
  };

  // Clean addLabel string (remove leading '+' if present)
  const cleanAddLabel = addLabel.replace(/^\+\s*/, '');

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'input flex items-center justify-between cursor-pointer py-1 px-2.5 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs transition-colors',
          isOpen && 'ring-2 ring-emerald-500 border-emerald-500',
          disabled && 'opacity-60 bg-slate-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen && isTyping ? searchQuery : searchQuery || displayValuePlaceholder(isOpen, selectedLabel, placeholder)}
          placeholder={placeholder}
          onClick={() => {
            if (!isOpen) handleOpen();
          }}
          onFocus={() => {
            if (!isOpen) handleOpen();
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsTyping(true);
            if (!isOpen) {
              updateCoords();
              setIsOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setIsTyping(false);
              setSearchQuery(selectedLabel);
            }
            if (e.key === 'Enter' && filteredOptions.length > 0) {
              handleSelect(filteredOptions[0].value);
            }
          }}
          className="w-full text-xs outline-none bg-transparent font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
        />
        <ChevronDown
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              setIsOpen(false);
              setIsTyping(false);
              setSearchQuery(selectedLabel);
            } else {
              handleOpen();
            }
          }}
          className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 cursor-pointer', isOpen && 'rotate-180')}
        />
      </div>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={dropdownRef}
            data-portal="custom-select"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 220),
              zIndex: 999999,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1"
          >
            {/* Options List */}
            <div className="max-h-56 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic text-center">No matching records</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value.toUpperCase() === (value || '').toUpperCase();
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(opt.value);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <div className="truncate mr-2">
                        <span>{opt.label}</span>
                        {opt.sublabel && <span className="text-[10px] text-slate-400 block font-normal">{opt.sublabel}</span>}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Optional + Add Action */}
            {onAddClick && (
              <div className="border-t border-slate-100 p-1 bg-slate-50/80">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                    setIsTyping(false);
                    onAddClick();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100/70 rounded-md transition-colors cursor-pointer select-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{cleanAddLabel}</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function displayValuePlaceholder(isOpen: boolean, label: string, placeholder: string): string {
  if (isOpen) return '';
  return label || placeholder;
}
