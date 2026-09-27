'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
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
  title = 'Drag & Drop your file here',
  description = 'Supports CSV, XLSX, XLS, TXT (up to 20MB). You can also paste (Ctrl+V).',
  className,
}: UniversalFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateAndSelect = (file: File) => {
    setErrorMsg(null);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMsg(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }
    onFileSelect(file);
  };

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
  }, []);

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[var(--radius-xl)] bg-[var(--color-snow)] transition-all duration-200 cursor-pointer select-none text-center',
          isDragging
            ? 'border-[var(--color-leaf)] bg-[var(--color-mist)]/40 scale-[1.01]'
            : 'border-[var(--color-border-medium)] hover:border-[var(--color-leaf)] hover:bg-white',
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

        <div className="w-12 h-12 rounded-full bg-[var(--color-mist)] flex items-center justify-center text-[var(--color-forest)] mb-3 shadow-xs">
          <UploadCloud className="w-6 h-6 stroke-[2]" />
        </div>

        <h4 className="text-sm font-semibold text-[var(--color-charcoal)] font-display">
          {title}
        </h4>
        <p className="text-xs text-[var(--color-slate)] mt-1 max-w-sm">
          {description}
        </p>

        <button
          type="button"
          className="btn btn--secondary mt-4 text-xs font-semibold py-1.5 px-4 shadow-xs"
        >
          Browse Local Files
        </button>
      </div>

      {/* Selected File Details */}
      {fileName && (
        <div className="flex items-center justify-between p-3 bg-white border border-[var(--color-border-light)] rounded-[var(--radius-md)] shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 overflow-hidden mr-2">
            <div className="p-2 bg-emerald-50 text-[var(--color-forest)] rounded">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-[var(--color-charcoal)] truncate">
                {fileName}
              </span>
              <span className="text-[10px] text-[var(--color-slate)]">Ready for processing</span>
            </div>
          </div>

          {onClear && !isProcessing && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && progress !== undefined && (
        <div className="flex flex-col gap-1 p-3 bg-[var(--color-snow)] border border-[var(--color-border-light)] rounded-[var(--radius-md)] shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--color-forest)] truncate mr-2">
              {progressPhase || 'Processing records...'}
            </span>
            <span className="font-mono text-[var(--color-charcoal)] font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-leaf)] transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2 text-xs text-[var(--color-negative)] bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
