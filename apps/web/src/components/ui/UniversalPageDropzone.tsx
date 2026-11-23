'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, FileSpreadsheet, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface UniversalPageDropzoneProps {
  onFileDrop: (file: File) => void;
  title?: string;
  subtitle?: string;
  acceptedExtensions?: string[]; // e.g. ['.csv', '.txt', '.xlsx', '.xls']
  disabled?: boolean;
}

export function UniversalPageDropzone({
  onFileDrop,
  title = 'Drop file to start import',
  subtitle = 'Supports CSV, TXT, and Excel (.xlsx, .xls) files',
  acceptedExtensions = ['.csv', '.txt', '.xlsx', '.xls'],
  disabled = false,
}: UniversalPageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (disabled) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      // Only respond if dragging files
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter.current += 1;
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const lowerName = file.name.toLowerCase();
        const matchesExt = acceptedExtensions.some((ext) => lowerName.endsWith(ext.toLowerCase()));

        if (matchesExt || acceptedExtensions.length === 0) {
          onFileDrop(file);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onFileDrop, acceptedExtensions, disabled]);

  if (!isDragging || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150 select-none pointer-events-auto"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer?.files?.[0]) {
          onFileDrop(e.dataTransfer.files[0]);
        }
      }}
    >
      <div className="w-full max-w-lg p-1.5 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/40 shadow-2xl pointer-events-none transform scale-100 transition-transform animate-in zoom-in-95 duration-150">
        <div className="p-8 rounded-[calc(1.5rem-0.375rem)] bg-white border-2 border-dashed border-[#2652C8] flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8] shadow-md">
              <UploadCloud className="w-10 h-10 animate-pulse stroke-[2.2]" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
              <ArrowDown className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm">
              {subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2652C8]" />
            <span>Drop anywhere on this window to parse &amp; validate</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
