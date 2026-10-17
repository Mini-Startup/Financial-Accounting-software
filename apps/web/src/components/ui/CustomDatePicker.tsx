'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or DD/MM/YYYY or datetime string
  onChange: (newValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  disabled = false,
  className,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to Date
  const parseValueToDate = (valStr: string): Date => {
    if (!valStr) return new Date();
    const cleaned = valStr.trim().split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      const [y, m, d] = cleaned.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const currentDate = parseValueToDate(value);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth()); // 0-indexed
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    const d = parseValueToDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
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

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
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
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Display value formatted as YYYY-MM-DD
  const formatIso = (dateObj: Date): string => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplay = (valStr: string): string => {
    if (!valStr) return '';
    const d = parseValueToDate(valStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Generate days grid for viewMonth & viewYear
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const daysGrid: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];
  
  // Previous month padding
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const d = new Date(viewYear, viewMonth - 1, dayNum);
    daysGrid.push({ day: dayNum, dateStr: formatIso(d), isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(viewYear, viewMonth, i);
    daysGrid.push({ day: i, dateStr: formatIso(d), isCurrentMonth: true });
  }

  // Next month padding to fill 35 or 42 cells
  const remaining = (7 - (daysGrid.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(viewYear, viewMonth + 1, i);
    daysGrid.push({ day: i, dateStr: formatIso(d), isCurrentMonth: false });
  }

  const selectedIso = value ? formatIso(parseValueToDate(value)) : '';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        onClick={handleToggle}
        className={cn(
          'input flex items-center justify-between cursor-pointer select-none py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs transition-colors',
          isOpen && 'ring-2 ring-emerald-500 border-emerald-500',
          disabled && 'opacity-60 bg-slate-50 cursor-not-allowed'
        )}
      >
        <span className={cn('truncate mr-2 font-mono font-medium', !value && 'text-slate-400 font-sans')}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={dropdownRef}
            data-portal="custom-datepicker"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              width: 260,
              zIndex: 999999,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl p-3"
          >
            {/* Header: Month & Year Controls */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else {
                    setViewMonth(viewMonth - 1);
                  }
                }}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else {
                    setViewMonth(viewMonth + 1);
                  }
                }}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {daysGrid.map((item, idx) => {
                const isSelected = item.dateStr === selectedIso;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(item.dateStr);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'py-1 rounded-md text-center font-mono text-[11px] transition-colors',
                      !item.isCurrentMonth && 'text-slate-300',
                      item.isCurrentMonth && !isSelected && 'text-slate-700 hover:bg-slate-100',
                      isSelected && 'bg-emerald-600 text-white font-bold'
                    )}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
