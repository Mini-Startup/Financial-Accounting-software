'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowRight, ArrowLeft, Replace, CheckCheck, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FindAndReplaceColumn {
  key: string;
  label: string;
}

export interface FindAndReplaceProps<T> {
  data: T[];
  columns: FindAndReplaceColumn[];
  onReplaceOne: (rowIndex: number, columnKey: string, newValue: string) => void;
  onReplaceAll: (columnKey: string, findValue: string, replaceValue: string) => void;
  onClose?: () => void;
  className?: string;
}

export function FindAndReplace<T>({
  data,
  columns,
  onReplaceOne,
  onReplaceAll,
  onClose,
  className,
}: FindAndReplaceProps<T>) {
  const [targetColumn, setTargetColumn] = useState<string>(columns[0]?.key || '');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Find all matching row indices in the target column
  const matchingIndices = useMemo(() => {
    if (!findText.trim() || !targetColumn) return [];
    const query = findText.toLowerCase();

    const matches: number[] = [];
    data.forEach((row, idx) => {
      const val = String((row as any)[targetColumn] || '').toLowerCase();
      if (val.includes(query)) {
        matches.push(idx);
      }
    });
    return matches;
  }, [data, targetColumn, findText]);

  const matchCount = matchingIndices.length;

  const handleNextMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev < matchCount - 1 ? prev + 1 : 0));
  };

  const handlePrevMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : matchCount - 1));
  };

  const handleReplaceOne = () => {
    if (matchCount === 0) return;
    const rowIndex = matchingIndices[currentMatchIndex];
    if (rowIndex !== undefined) {
      onReplaceOne(rowIndex, targetColumn, replaceText);
    }
  };

  const handleReplaceAll = () => {
    if (matchCount === 0) return;
    onReplaceAll(targetColumn, findText, replaceText);
  };

  return (
    <div
      className={cn(
        'p-3.5 bg-white border border-[var(--color-border-medium)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] flex flex-col gap-3 text-xs',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2">
        <div className="flex items-center gap-2">
          <Replace className="w-4 h-4 text-[var(--color-leaf)]" />
          <h4 className="font-semibold text-[var(--color-charcoal)] uppercase tracking-wider text-[11px]">
            Find & Replace in Table
          </h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Find Column & Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-[var(--color-slate)] text-[11px]">Target Column</label>
          <select
            value={targetColumn}
            onChange={(e) => {
              setTargetColumn(e.target.value);
              setCurrentMatchIndex(0);
            }}
            className="h-8 px-2.5 bg-[var(--color-snow)] border border-[var(--color-border-medium)] rounded-[var(--radius-md)] text-xs text-[var(--color-charcoal)] outline-none focus:border-[var(--color-border-focus)]"
          >
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <label className="font-semibold text-[var(--color-slate)] text-[11px] mt-1">Find Value</label>
          <div className="flex items-center bg-white border border-[var(--color-border-medium)] rounded-[var(--radius-md)] focus-within:border-[var(--color-border-focus)]">
            <Search className="w-3.5 h-3.5 text-[var(--color-fog)] ml-2.5 shrink-0" />
            <input
              type="text"
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Text to find..."
              className="w-full h-8 px-2 text-xs bg-transparent outline-none text-[var(--color-charcoal)]"
            />
            {findText && (
              <span className="text-[11px] font-mono text-[var(--color-slate)] px-2 shrink-0">
                {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0'}
              </span>
            )}
          </div>
        </div>

        {/* Replace Input & Controls */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-[var(--color-slate)] text-[11px]">Replace With</label>
            {matchCount > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  title="Previous Match"
                  className="p-1 hover:bg-[var(--color-snow)] rounded text-[var(--color-slate)]"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  title="Next Match"
                  className="p-1 hover:bg-[var(--color-snow)] rounded text-[var(--color-slate)]"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replacement text..."
            className="h-8 px-2.5 bg-white border border-[var(--color-border-medium)] rounded-[var(--radius-md)] text-xs text-[var(--color-charcoal)] outline-none focus:border-[var(--color-border-focus)]"
          />

          <div className="flex items-center justify-end gap-2 mt-auto pt-2">
            <button
              type="button"
              disabled={matchCount === 0}
              onClick={handleReplaceOne}
              className="px-3 py-1.5 font-semibold text-[var(--color-forest)] bg-[var(--color-snow)] hover:bg-[var(--color-mist)] border border-[var(--color-border-light)] rounded-[var(--radius-sm)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Replace Next
            </button>
            <button
              type="button"
              disabled={matchCount === 0}
              onClick={handleReplaceAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-[var(--color-forest)] hover:bg-[var(--color-emerald)] rounded-[var(--radius-sm)] shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Replace All ({matchCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
