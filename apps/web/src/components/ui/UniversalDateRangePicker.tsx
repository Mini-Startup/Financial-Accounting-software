'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

export interface DateRange {
  startDate: string; // ISO format 'YYYY-MM-DD' or ''
  endDate: string;   // ISO format 'YYYY-MM-DD' or ''
}

export interface UniversalDateRangePickerProps {
  startDate?: string;
  endDate?: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
}

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseISODate(str: string): { year: number; month: number; day: number } | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function UniversalDateRangePicker({
  startDate = '',
  endDate = '',
  value,
  onChange,
  placeholder = 'Select Date Range',
  className,
  compact = false,
}: UniversalDateRangePickerProps) {
  const currentStart = value ? value.startDate : startDate;
  const currentEnd = value ? value.endDate : endDate;

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Draft selection state inside popover
  const [draftStart, setDraftStart] = useState<string>(currentStart);
  const [draftEnd, setDraftEnd] = useState<string>(currentEnd);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Visible month in calendar view
  const initialParsed = parseISODate(currentStart) || parseISODate(currentEnd);
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(initialParsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialParsed?.month ?? today.getMonth());

  // Calculate coordinates to portal above table overflow boundaries
  const calculateCoords = useCallback((): Coords | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();

    const popoverWidth = 330;
    const popoverHeight = 390;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16);
    }
    if (left < 16) {
      left = 16;
    }

    if (openUpward) {
      return {
        bottom: window.innerHeight - rect.top + 6,
        left,
      };
    }

    return {
      top: rect.bottom + 6,
      left,
    };
  }, []);

  const updateCoords = useCallback(() => {
    const nextCoords = calculateCoords();
    if (nextCoords) {
      setCoords(nextCoords);
    }
  }, [calculateCoords]);

  // Update coords on open and window resize/scroll
  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowChange = () => {
      updateCoords();
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen, updateCoords]);

  // Keep draft in sync when current props change
  useEffect(() => {
    setDraftStart(currentStart);
    setDraftEnd(currentEnd);
  }, [currentStart, currentEnd]);

  // Click outside listener (respects both trigger container and portaled popover)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setDraftStart(currentStart);
        setDraftEnd(currentEnd);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, currentStart, currentEnd]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Days in month matrix
  const daysInMonth = useMemo(() => {
    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Leading days from previous month
    const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ day: d, dateStr: toISODate(y, m, d), isCurrentMonth: false });
    }

    // Days of current month
    for (let d = 1; d <= daysCount; d++) {
      days.push({ day: d, dateStr: toISODate(viewYear, viewMonth, d), isCurrentMonth: true });
    }

    // Trailing days of next month to complete 6 rows (42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ day: d, dateStr: toISODate(y, m, d), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Handle day click
  const handleDayClick = (dateStr: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      // Step 1: Select new start date
      setDraftStart(dateStr);
      setDraftEnd('');
    } else if (draftStart && !draftEnd) {
      // Step 2: Select end date
      if (dateStr < draftStart) {
        // If clicked date is before start date, restart range
        setDraftStart(dateStr);
        setDraftEnd('');
      } else {
        setDraftEnd(dateStr);
      }
    }
  };

  // Preset handlers
  const handlePreset = (type: 'today' | 'yesterday' | 'week' | 'month' | 'last30') => {
    const now = new Date();
    const todayStr = toISODate(now.getFullYear(), now.getMonth(), now.getDate());

    if (type === 'today') {
      setDraftStart(todayStr);
      setDraftEnd(todayStr);
      onChange({ startDate: todayStr, endDate: todayStr });
      setIsOpen(false);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toISODate(y.getFullYear(), y.getMonth(), y.getDate());
      setDraftStart(yStr);
      setDraftEnd(yStr);
      onChange({ startDate: yStr, endDate: yStr });
      setIsOpen(false);
    } else if (type === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const mon = new Date(now.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const startStr = toISODate(mon.getFullYear(), mon.getMonth(), mon.getDate());
      const endStr = toISODate(sun.getFullYear(), sun.getMonth(), sun.getDate());
      setDraftStart(startStr);
      setDraftEnd(endStr);
      onChange({ startDate: startStr, endDate: endStr });
      setIsOpen(false);
    } else if (type === 'month') {
      const startStr = toISODate(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const endStr = toISODate(now.getFullYear(), now.getMonth(), lastDay);
      setDraftStart(startStr);
      setDraftEnd(endStr);
      onChange({ startDate: startStr, endDate: endStr });
      setIsOpen(false);
    } else if (type === 'last30') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      const startStr = toISODate(past.getFullYear(), past.getMonth(), past.getDate());
      setDraftStart(startStr);
      setDraftEnd(todayStr);
      onChange({ startDate: startStr, endDate: todayStr });
      setIsOpen(false);
    }
  };

  const handleApply = () => {
    onChange({
      startDate: draftStart,
      endDate: draftEnd || draftStart,
    });
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDraftStart('');
    setDraftEnd('');
    onChange({ startDate: '', endDate: '' });
    setIsOpen(false);
  };

  // Label display logic
  const displayLabel = useMemo(() => {
    if (currentStart && currentEnd) {
      if (currentStart === currentEnd) {
        return formatDateToDDMMYY(currentStart);
      }
      return `${formatDateToDDMMYY(currentStart)} → ${formatDateToDDMMYY(currentEnd)}`;
    }
    if (currentStart) {
      return `From ${formatDateToDDMMYY(currentStart)}`;
    }
    if (currentEnd) {
      return `Up to ${formatDateToDDMMYY(currentEnd)}`;
    }
    return placeholder;
  }, [currentStart, currentEnd, placeholder]);

  const hasValue = Boolean(currentStart || currentEnd);

  return (
    <div ref={containerRef} className={cn('relative select-none', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          updateCoords();
        }}
        className={cn(
          'w-full flex items-center justify-between border bg-white rounded-xl shadow-2xs transition-all cursor-pointer font-sans text-xs',
          compact ? 'h-8.5 px-2.5' : 'h-9 px-3',
          isOpen
            ? 'border-[#2652C8] ring-2 ring-blue-100'
            : hasValue
            ? 'border-blue-300 bg-blue-50/20 text-slate-900 font-semibold'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50/50'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className={cn('w-3.5 h-3.5 shrink-0', hasValue ? 'text-[#2652C8]' : 'text-slate-400')} />
          <span className="truncate">{displayLabel}</span>
        </div>

        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors shrink-0 ml-1.5 cursor-pointer"
            title="Clear date range"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </button>

      {/* Portaled Popover Card: Floating freely above table scrollbars and card overflow boundaries */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
            className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-4 w-[330px] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3 select-none"
          >
            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => handlePreset('today')}
                className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-[#2652C8] text-slate-600 rounded-md border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePreset('yesterday')}
                className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-[#2652C8] text-slate-600 rounded-md border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handlePreset('week')}
                className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-[#2652C8] text-slate-600 rounded-md border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => handlePreset('month')}
                className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-[#2652C8] text-slate-600 rounded-md border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset('last30')}
                className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-[#2652C8] text-slate-600 rounded-md border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                30 Days
              </button>
            </div>

            {/* Month / Year Navigation */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day Names Row */}
            <div className="grid grid-cols-7 text-center">
              {DAYS_OF_WEEK.map((d) => (
                <span key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-xs">
              {daysInMonth.map(({ day, dateStr, isCurrentMonth }, idx) => {
                const isStart = draftStart === dateStr;
                const isEnd = draftEnd === dateStr;
                const effectiveEnd = draftEnd || (hoverDate && hoverDate > draftStart ? hoverDate : '');
                const isInRange =
                  draftStart && effectiveEnd && dateStr > draftStart && dateStr < effectiveEnd;

                const isToday = toISODate(today.getFullYear(), today.getMonth(), today.getDate()) === dateStr;

                return (
                  <button
                    key={`${dateStr}-${idx}`}
                    type="button"
                    onClick={() => handleDayClick(dateStr)}
                    onMouseEnter={() => {
                      if (draftStart && !draftEnd) {
                        setHoverDate(dateStr);
                      }
                    }}
                    className={cn(
                      'h-8 w-full flex items-center justify-center font-medium transition-all cursor-pointer relative',
                      !isCurrentMonth && 'text-slate-300',
                      isCurrentMonth && !isStart && !isEnd && !isInRange && 'text-slate-700 hover:bg-slate-100 rounded-lg',
                      isStart && 'bg-[#2652C8] text-white font-bold rounded-l-lg shadow-2xs z-1',
                      isEnd && 'bg-[#2652C8] text-white font-bold rounded-r-lg shadow-2xs z-1',
                      isStart && isEnd && 'rounded-lg',
                      isInRange && 'bg-blue-50 text-blue-900 font-semibold',
                      isToday && !isStart && !isEnd && 'underline decoration-[#2652C8] decoration-2 underline-offset-2 font-bold'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Manual Input Readouts & Apply Footer */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block">From</span>
                  <span className="font-semibold">{draftStart ? formatDateToDDMMYY(draftStart) : '—'}</span>
                </div>
                <span className="text-slate-400 font-bold">→</span>
                <div className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block">To</span>
                  <span className="font-semibold">{draftEnd ? formatDateToDDMMYY(draftEnd) : '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#2652C8] hover:bg-[#1F42A3] text-white rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
