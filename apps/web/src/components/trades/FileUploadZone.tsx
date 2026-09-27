'use client';

import { useRef, useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export function FileUploadZone({ onFileSelected, isProcessing }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const processFile = useCallback(
    (file: File) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const validExtensions = ['.txt', '.csv', '.xlsx', '.xls'];

      if (!validExtensions.includes(ext)) {
        toast.error('Please upload a .txt, .csv, or Excel (.xlsx, .xls) file.');
        return;
      }

      setSelectedFile({ name: file.name, size: file.size });
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      className={`trade-upload-zone ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={0}
      aria-label="Upload trade file"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,.xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {isProcessing ? (
        <div className="trade-processing flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
          <span className="trade-upload-title text-base font-semibold">Processing file…</span>
          <span className="trade-upload-subtitle text-sm text-[var(--color-slate)]">Parsing and validating trade rows</span>
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="trade-upload-icon bg-[var(--color-mist)] p-4 rounded-full text-[var(--color-primary)] mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <span className="trade-upload-title text-base font-semibold text-[var(--color-charcoal)]">
            {isDragging ? 'Drop your file here' : 'Upload Trade File'}
          </span>
          <span className="trade-upload-subtitle text-sm text-[var(--color-slate)] mt-1 max-w-sm">
            Drag & drop a CSV, text, or Excel file, or <span className="text-[var(--color-primary)] font-medium underline">browse your files</span>
          </span>

          <div className="trade-upload-filetag flex items-center gap-1.5 mt-4 bg-[var(--color-snow)] px-3 py-1 rounded-md border border-[var(--color-border-light)] text-xs text-[var(--color-slate)] font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel, .csv or .txt file format
          </div>

          {selectedFile && (
            <div className="trade-upload-selected flex items-center gap-2 mt-4 bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-xs font-semibold text-green-800 shadow-sm animate-fade-in">
              <span>✓ {selectedFile.name}</span>
              <span className="text-green-600 font-mono">({formatSize(selectedFile.size)})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
