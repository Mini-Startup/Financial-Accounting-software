'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface UniversalFileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  fileName?: string;
  isProcessing?: boolean;
  progress?: number; // 0 to 100
  progressPhase?: string;
  onClear?: () => void;
  title?: string;
  description?: string;
  className?: string;
  isInvalid?: boolean;
  statusText?: string;
}

export function UniversalFileUploader({
  onFileSelect,
  accept = '.csv, .xlsx, .xls, .txt',
  maxSizeMB = 20,
  fileName,
  isProcessing = false,
  progress,
  progressPhase,
  onClear,
  title = 'Select or drop file',
  description = 'Supports CSV, XLSX, XLS, TXT (up to 20MB). You can also paste (Ctrl+V).',
  className,
  isInvalid = false,
  statusText,
}: UniversalFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateAndSelect = useCallback((file: File) => {
    setErrorMsg(null);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMsg(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }
    onFileSelect(file);
  }, [maxSizeMB, onFileSelect]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
  };

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            validateAndSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [validateAndSelect]);

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {/* When a file is already selected, replace the dropzone with a clean file card */}
      {fileName ? (
        <div
          className={cn(
            'flex items-center justify-between p-3.5 rounded-xl border transition-all animate-in fade-in duration-150',
            isInvalid
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-white border-slate-200/90 shadow-2xs'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 mr-3">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
                isInvalid
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              )}
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold font-mono text-slate-900 truncate">
                {fileName}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {isInvalid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-100/70 px-2 py-0.2 rounded border border-rose-200/80">
                    Invalid file
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {statusText || 'Ready for processing'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {onClear && !isProcessing && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
              <span>Remove file</span>
            </button>
          )}
        </div>
      ) : (
        /* Dropzone visible only when NO file is selected */
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-snow transition-all duration-200 cursor-pointer select-none text-center',
            isDragging
              ? 'border-blue-500 bg-blue-50/40 scale-[1.01]'
              : 'border-slate-200 hover:border-blue-400 hover:bg-white',
            isProcessing && 'pointer-events-none opacity-80'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validateAndSelect(f);
            }}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3 shadow-xs border border-blue-100">
            <UploadCloud className="w-6 h-6 stroke-2" />
          </div>

          <h4 className="text-sm font-semibold text-slate-900 font-display">
            {title}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {description}
          </p>

          <button
            type="button"
            className="btn btn--secondary mt-4 text-xs font-semibold py-1.5 px-4 shadow-xs"
          >
            Browse Local Files
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && progress !== undefined && (
        <div className="flex flex-col gap-1 p-3 bg-snow border border-border-light rounded-md shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-(--color-forest) truncate mr-2">
              {progressPhase || 'Processing records...'}
            </span>
            <span className="font-mono text-charcoal font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-sm overflow-hidden">
            <div
              className="h-full bg-(--color-leaf) transition-all duration-200 rounded-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2 text-xs text-negative bg-red-50 border border-red-200 rounded-md">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
