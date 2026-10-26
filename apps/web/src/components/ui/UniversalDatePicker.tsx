'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDateForInput, formatDateToDDMMYY, formatTypingDate, normalizeYear, parseDateDetailed } from '@/utils/dateUtils';

export interface UniversalDatePickerProps {
  value: string; // YYYY-MM-DD or flexible format
  onChange: (newValue: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  error?: string;
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
  openUpward: boolean;
}

export function UniversalDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'DD-MM-YY',
  disabled = false,
  className,
  id,
  error,
}: UniversalDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState(() => formatDateToDDMMYY(value));
  const [localError, setLocalError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setTextValue(formatDateToDDMMYY(value));
    setLocalError(null);
  }

  const calculateCoords = useCallback((): Coords | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();

    const calendarHeight = 310;
    const calendarWidth = 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < calendarHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + calendarWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - calendarWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    if (openUpward) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        openUpward: true,
      };
    }

    return {
      top: rect.bottom + 4,
      left,
      openUpward: false,
    };
  }, []);

  const updateCoords = useCallback(() => {
    const newCoords = calculateCoords();
    if (newCoords) {
      setCoords(newCoords);
    }
  }, [calculateCoords]);

  // Calendar View month/year state
  const parseToDate = (str: string): Date => {
    const norm = formatDateForInput(str);
    if (!norm) return new Date();
    const [y, m, d] = norm.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const activeDate = parseToDate(value || textValue);
  const [viewYear, setViewYear] = useState(activeDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(activeDate.getMonth());

  const openPicker = () => {
    if (disabled) return;
    const initialCoords = calculateCoords();
    if (initialCoords) {
      setCoords(initialCoords);
    }
    const d = parseToDate(value || textValue);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(true);
  };

  const closePicker = () => {
    setIsOpen(false);
  };

  const togglePicker = () => {
    if (disabled) return;
    if (isOpen) {
      closePicker();
    } else {
      openPicker();
    }
  };

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        closePicker();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle input change: auto-format as digits are typed without forcing the user to type hyphens
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw.trim()) {
      setTextValue('');
      setLocalError(null);
      onChange('');
      return;
    }

    // Auto-format digits into DD-MM-YY (user doesn't need to type hyphens)
    const formatted = formatTypingDate(raw);
    setTextValue(formatted);

    // If 6 or 8 digits typed, or complete DD-MM-YY format with separators
    const digits = raw.replace(/\D/g, '');
    const hasThreeParts = formatted.split(/[-/.]/).length === 3;

    if (digits.length >= 6 || (hasThreeParts && digits.length >= 5)) {
      const result = parseDateDetailed(formatted);
      if (!result.isValid) {
        setLocalError(result.error || 'Invalid date (DD-MM-YY)');
        onChange('');
      } else if (result.iso) {
        if (minDate && result.iso < formatDateForInput(minDate)) {
          setLocalError(`Date cannot be before ${formatDateToDDMMYY(minDate)}`);
          onChange('');
        } else if (maxDate && result.iso > formatDateForInput(maxDate)) {
          setLocalError(`Date cannot be after ${formatDateToDDMMYY(maxDate)}`);
          onChange('');
        } else {
          setLocalError(null);
          onChange(result.iso);
        }
      }
    } else {
      // In the middle of typing digits (e.g. "21" or "21-05")
      // Check if partial day or month typed so far is already clearly invalid
      const parts = formatted.split(/[-/.]/);
      if (parts[0] && parts[0].length === 2) {
        const d = parseInt(parts[0], 10);
        if (d < 1 || d > 31) {
          setLocalError('Day must be between 01 and 31');
          onChange('');
          return;
        }
      }
      if (parts[1] && parts[1].length === 2) {
        const m = parseInt(parts[1], 10);
        if (m < 1 || m > 12) {
          setLocalError('Month must be between 01 and 12');
          onChange('');
          return;
        }
      }
      setLocalError(null);
    }
  };

  // Handle typing blur & smart year expansion
  const handleBlur = () => {
    if (!textValue.trim()) {
      onChange('');
      setLocalError(null);
      return;
    }

    const result = parseDateDetailed(textValue);
    if (!result.isValid || !result.iso) {
      setLocalError(result.error || 'Invalid date (DD-MM-YY)');
      onChange('');
      return;
    }

    if (minDate && result.iso < formatDateForInput(minDate)) {
      setLocalError(`Date cannot be before ${formatDateToDDMMYY(minDate)}`);
      onChange('');
      return;
    }
    if (maxDate && result.iso > formatDateForInput(maxDate)) {
      setLocalError(`Date cannot be after ${formatDateToDDMMYY(maxDate)}`);
      onChange('');
      return;
    }

    setLocalError(null);
    setTextValue(formatDateToDDMMYY(result.iso));
    onChange(result.iso);
  };

  // Calendar Days generator
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const daysGrid: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    daysGrid.push({
      day: dayNum,
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push({
      day: i,
      dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: true,
    });
  }

  const remaining = (7 - (daysGrid.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    daysGrid.push({
      day: i,
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  const selectedIso = formatDateForInput(value);
  const activeError = error || localError;

  return (
    <div ref={containerRef} className={cn('relative flex flex-col gap-1 w-full', className)}>
      <div
        className={cn(
          'flex items-center bg-white border rounded-[var(--radius-md)] shadow-xs transition-all duration-150',
          activeError
            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-950'
            : 'border-[var(--color-border-medium)] focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/20',
          disabled && 'opacity-60 bg-slate-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={textValue}
          disabled={disabled}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBlur();
            }
          }}
          placeholder={placeholder}
          maxLength={10}
          className="w-full h-[36px] px-3 text-xs font-mono tabular-nums text-[var(--color-charcoal)] placeholder:text-[var(--color-fog)] outline-none bg-transparent"
        />

        {(value || textValue) && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setTextValue('');
              setLocalError(null);
            }}
            className="p-1 text-[var(--color-slate)] hover:text-rose-600 rounded cursor-pointer"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={togglePicker}
          className="p-2 text-[var(--color-slate)] hover:text-[var(--color-forest)] transition-colors cursor-pointer select-none"
          title={isOpen ? 'Close Calendar' : 'Open Calendar'}
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {activeError && (
        <span className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{activeError}</span>
        </span>
      )}

      {/* Calendar Popup Portal */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            data-portal="datepicker"
            data-universal-datepicker="true"
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
              width: 280,
              zIndex: 999999,
            }}
            className="bg-white border border-[var(--color-border-light)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-3 duration-100"
          >
            {/* Calendar Header */}
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
                className="p-1 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-snow)] rounded-[var(--radius-sm)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-[var(--color-charcoal)] font-display">
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
                className="p-1 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-snow)] rounded-[var(--radius-sm)] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-wider mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {daysGrid.map((item, idx) => {
                const isSelected = item.dateStr === selectedIso;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(item.dateStr);
                      setTextValue(formatDateToDDMMYY(item.dateStr));
                      setLocalError(null);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'py-1.5 rounded-[var(--radius-sm)] text-center font-mono text-[11px] transition-colors cursor-pointer',
                      !item.isCurrentMonth && 'text-[var(--color-fog)]',
                      item.isCurrentMonth && !isSelected && 'text-[var(--color-charcoal)] hover:bg-[var(--color-mist)]/50',
                      isSelected && 'bg-[var(--color-forest)] text-white font-bold shadow-xs'
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
