'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Plus } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (newValue: string) => void;
  onDoubleClick?: () => void;
  className?: string;
  placeholder?: string;
  title?: string;
  onAddClick?: () => void;
  addLabel?: string;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  onDoubleClick,
  className,
  placeholder,
  title,
  onAddClick,
  addLabel = 'Add New',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [isTyping, setIsTyping] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!isOpen) {
      setSearchQuery(value);
    }
  }

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
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
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        if (searchQuery !== value) {
          onChange(searchQuery);
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, searchQuery, value, onChange]);

  const handleFocus = () => {
    setIsOpen(true);
    setIsTyping(false);
    updateCoords();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
      onChange(searchQuery);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery(value);
      inputRef.current?.blur();
    }
  };

  const filteredOptions = isTyping
    ? options.filter(
        (opt) =>
          opt.value.toUpperCase().includes(searchQuery.toUpperCase()) ||
          opt.label.toUpperCase().includes(searchQuery.toUpperCase())
      )
    : options;

  const cleanAddLabel = addLabel.replace(/^\+\s*/, '');

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className={className}
        value={isOpen ? searchQuery : value}
        onFocus={handleFocus}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsTyping(true);
        }}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => {
          setIsOpen(false);
          onDoubleClick?.();
        }}
        placeholder={placeholder}
        title={title}
      />
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            data-portal="searchable-select"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 240),
              zIndex: 999999,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1"
          >
            <div className="max-h-56 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic">No matching records</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value.toUpperCase() === value.toUpperCase();
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(opt.value);
                        setIsOpen(false);
                        setIsTyping(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span className="truncate mr-2">{opt.label}</span>
                      {isSelected && <span className="text-emerald-600 font-bold shrink-0">✓</span>}
                    </button>
                  );
                })
              )}
            </div>

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
