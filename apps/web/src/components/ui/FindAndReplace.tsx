'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Replace,
  CheckCheck,
  X,
  Search,
  Sparkles,
  CaseSensitive,
  WholeWord,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { UniversalDropdown } from './UniversalDropdown';

export interface FindAndReplaceColumn {
  key: string;
  label: string;
}

export interface FindReplaceMatchState {
  matchedRowIndices: number[];
  activeRowIndex: number | null;
  targetColumn: string;
  findText: string;
  replaceText: string;
  matchCase: boolean;
  matchWholeWord: boolean;
}

export interface FindAndReplaceProps<T> {
  data: T[];
  columns: FindAndReplaceColumn[];
  onReplaceOne: (rowIndex: number, columnKey: string, newValue: string) => void;
  onReplaceAll: (columnKey: string, findValue: string, replaceValue: string) => void;
  onClose?: () => void;
  onMatchChange?: (state: FindReplaceMatchState | null) => void;
  className?: string;
}

export const buildSearchRegex = (term: string, caseSensitive: boolean, wholeWord: boolean) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = wholeWord ? `(?:^|\\b)${escaped}(?:\\b|$)` : escaped;
  const flags = caseSensitive ? '' : 'i';
  return new RegExp(pattern, flags);
};

export function FindAndReplace<T>({
  data,
  columns,
  onReplaceOne,
  onReplaceAll,
  onClose,
  onMatchChange,
  className,
}: FindAndReplaceProps<T>) {
  const [targetColumn, setTargetColumn] = useState<string>(columns[0]?.key || '');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const findInputRef = useRef<HTMLInputElement>(null);

  // Focus find input on mount
  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  // Global Ctrl+F / Escape toggle listener to close window
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [onClose]);

  // Compute matching row indices in target column with case & whole-word options
  const matchingIndices = useMemo(() => {
    if (!findText.trim() || !targetColumn) return [];
    try {
      const regex = buildSearchRegex(findText, matchCase, matchWholeWord);
      const matches: number[] = [];
      data.forEach((row, idx) => {
        const val = String((row as any)[targetColumn] || '');
        if (regex.test(val)) {
          matches.push(idx);
        }
      });
      return matches;
    } catch {
      return [];
    }
  }, [data, targetColumn, findText, matchCase, matchWholeWord]);

  const matchCount = matchingIndices.length;
  const activeRowIndex =
    matchCount > 0 && currentMatchIndex < matchCount
      ? matchingIndices[currentMatchIndex]
      : null;

  // Sync match state with parent table for real-row highlighting and previews
  useEffect(() => {
    if (onMatchChange) {
      if (!findText.trim()) {
        onMatchChange(null);
      } else {
        onMatchChange({
          matchedRowIndices: matchingIndices,
          activeRowIndex: activeRowIndex ?? null,
          targetColumn,
          findText,
          replaceText,
          matchCase,
          matchWholeWord,
        });
      }
    }
  }, [matchingIndices, activeRowIndex, targetColumn, findText, replaceText, matchCase, matchWholeWord, onMatchChange]);

  // Clean up match highlights on unmount
  useEffect(() => {
    return () => {
      onMatchChange?.(null);
    };
  }, [onMatchChange]);

  const isReplaceActive = Boolean(replaceText.trim().length > 0);

  const handleNextMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev < matchCount - 1 ? prev + 1 : 0));
  };

  const handlePrevMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : matchCount - 1));
  };

  const handleReplaceOne = () => {
    if (matchCount === 0 || activeRowIndex === null || !isReplaceActive) return;
    const targetRow = data[activeRowIndex];
    if (!targetRow) return;

    const currentVal = String((targetRow as any)[targetColumn] || '');
    const regex = buildSearchRegex(findText, matchCase, matchWholeWord);
    const updatedVal = currentVal.replace(regex, replaceText);

    onReplaceOne(activeRowIndex, targetColumn, updatedVal);

    // Keep pointer at valid index
    if (currentMatchIndex >= matchCount - 1) {
      setCurrentMatchIndex(Math.max(0, matchCount - 2));
    }
  };

  const handleReplaceAll = () => {
    if (matchCount === 0 || !isReplaceActive) return;
    onReplaceAll(targetColumn, findText, replaceText);
    setCurrentMatchIndex(0);
  };

  const activeRow = activeRowIndex !== null ? data[activeRowIndex] : null;
  const activeOldValue = activeRow ? String((activeRow as any)[targetColumn] || '') : '';
  const activePreviewValue = useMemo(() => {
    if (!activeOldValue || !findText.trim() || !isReplaceActive) return '';
    try {
      const regex = buildSearchRegex(findText, matchCase, matchWholeWord);
      return activeOldValue.replace(regex, replaceText);
    } catch {
      return replaceText;
    }
  }, [activeOldValue, findText, replaceText, matchCase, matchWholeWord, isReplaceActive]);

  const targetColumnLabel = columns.find((c) => c.key === targetColumn)?.label || targetColumn;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{ zIndex: 99999 }}
      className={cn(
        'fixed top-20 right-6 w-[440px] max-w-[94vw] bg-white/95 backdrop-blur-md border border-[var(--color-border-medium)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-4 flex flex-col gap-3.5 text-xs animate-in fade-in slide-in-from-top-4 duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[var(--color-mist)] text-[var(--color-forest)] rounded-lg">
            <Replace className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-charcoal)] text-xs font-display">
              {isReplaceActive ? 'Find & Replace' : 'Find in Table'}
            </h4>
            <span className="text-[10px] text-[var(--color-slate)]">
              {isReplaceActive
                ? 'Real-time in-table replacement'
                : 'Highlighting matching rows & cells'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {findText && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
                matchCount > 0
                  ? isReplaceActive
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              {matchCount > 0
                ? `${isReplaceActive ? 'Replace' : 'Match'} ${currentMatchIndex + 1} of ${matchCount}`
                : 'No matches'}
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Target Column Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-[var(--color-slate)]">Target Column</label>
        <UniversalDropdown
          value={targetColumn}
          onChange={(val) => {
            setTargetColumn(val);
            setCurrentMatchIndex(0);
          }}
          searchable={false}
          options={columns.map((c) => ({ value: c.key, label: c.label }))}
          triggerClassName="h-8.5 min-h-[34px] bg-slate-50 border border-[var(--color-border-medium)] rounded-lg text-xs font-medium"
        />
      </div>

      {/* Find Input with Navigation & Search Option Toggles */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--color-slate)]">Find Text</label>
          {matchCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-slate)] mr-1">Navigate:</span>
              <button
                type="button"
                onClick={handlePrevMatch}
                className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Previous Match (Up Arrow / Shift+Enter)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMatch}
                className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Next Match (Down Arrow / Enter)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="relative flex items-center bg-white border border-[var(--color-border-medium)] rounded-lg focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/20 shadow-2xs">
          <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
          <input
            ref={findInputRef}
            type="text"
            value={findText}
            onChange={(e) => {
              setFindText(e.target.value);
              setCurrentMatchIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                handleNextMatch();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                handlePrevMatch();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  handlePrevMatch();
                } else {
                  handleNextMatch();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
              }
            }}
            placeholder="Type text to find in table..."
            className="w-full h-8.5 pl-2 pr-1 text-xs bg-transparent outline-none text-[var(--color-charcoal)]"
          />

          {/* Search Options: Case Sensitivity & Exact Whole Word */}
          <div className="flex items-center gap-1.5 mr-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMatchCase(!matchCase);
                setCurrentMatchIndex(0);
              }}
              className={cn(
                'w-6 h-6 rounded-full transition-all cursor-pointer text-xs flex items-center justify-center',
                matchCase
                  ? 'bg-[var(--color-mist)] text-[var(--color-forest)] ring-1.5 ring-[var(--color-leaf)] font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
              title={matchCase ? 'Match Case (Active)' : 'Match Case (Inactive)'}
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setMatchWholeWord(!matchWholeWord);
                setCurrentMatchIndex(0);
              }}
              className={cn(
                'w-6 h-6 rounded-full transition-all cursor-pointer text-xs flex items-center justify-center',
                matchWholeWord
                  ? 'bg-[var(--color-mist)] text-[var(--color-forest)] ring-1.5 ring-[var(--color-leaf)] font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
              title={matchWholeWord ? 'Match Whole Word (Active)' : 'Match Whole Word (Inactive)'}
            >
              <WholeWord className="w-3.5 h-3.5" />
            </button>

            {findText && (
              <button
                type="button"
                onClick={() => {
                  setFindText('');
                  setCurrentMatchIndex(0);
                }}
                className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                title="Clear find text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replace Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-[var(--color-slate)]">
          Replace With <span className="font-normal text-slate-400">(leave blank for Find only)</span>
        </label>
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleNextMatch();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              handlePrevMatch();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (isReplaceActive) {
                handleReplaceOne();
              } else {
                if (e.shiftKey) handlePrevMatch();
                else handleNextMatch();
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose?.();
            }
          }}
          placeholder="Type replacement text to enable replace..."
          className="h-8.5 px-2.5 bg-white border border-[var(--color-border-medium)] rounded-lg text-xs text-[var(--color-charcoal)] outline-none focus:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/20 shadow-2xs"
        />
      </div>

      {/* Live In-Widget Preview Box */}
      {matchCount > 0 && activeRowIndex !== null && (
        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col gap-1.5 animate-in fade-in duration-100">
          <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Row #{activeRowIndex + 1} Spotlight ({targetColumnLabel})</span>
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              {matchCase && (
                <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono font-bold">
                  Aa
                </span>
              )}
              {matchWholeWord && (
                <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono font-bold">
                  \b
                </span>
              )}
              {!isReplaceActive && (
                <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-medium border border-amber-300">
                  Find Mode
                </span>
              )}
            </div>
          </div>

          {isReplaceActive ? (
            <div className="flex items-center gap-2 text-xs font-mono bg-white p-2 rounded-lg border border-amber-200">
              <span className="line-through text-red-600 truncate max-w-[140px]" title={activeOldValue}>
                {activeOldValue || '—'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-emerald-700 font-bold truncate max-w-[140px]" title={activePreviewValue}>
                {activePreviewValue || '—'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono bg-white p-2 rounded-lg border border-amber-200">
              <span className="text-slate-500 font-sans text-[11px] font-medium">Found:</span>
              <span className="text-amber-950 font-bold bg-amber-100 px-1.5 py-0.5 rounded truncate max-w-[280px]" title={activeOldValue}>
                {activeOldValue || '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--color-border-light)]">
        <button
          type="button"
          disabled={matchCount === 0 || !isReplaceActive}
          onClick={handleReplaceOne}
          title={!isReplaceActive ? 'Enter replacement text to enable replace' : undefined}
          className="px-3 py-1.5 font-semibold text-[var(--color-forest)] bg-[var(--color-snow)] hover:bg-[var(--color-mist)] border border-[var(--color-border-light)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs"
        >
          {isReplaceActive && matchCount > 0 && activeRowIndex !== null
            ? `Replace (Row #${activeRowIndex + 1})`
            : 'Replace'}
        </button>

        <button
          type="button"
          disabled={matchCount === 0 || !isReplaceActive}
          onClick={handleReplaceAll}
          title={!isReplaceActive ? 'Enter replacement text to enable replace all' : undefined}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-[var(--color-forest)] hover:bg-[var(--color-emerald)] rounded-lg shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Replace All ({matchCount})</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
