'use client';

import { useRef, useState, useCallback } from 'react';

interface FileUploadZoneProps {
  onFileRead: (content: string, fileName: string) => void;
  isProcessing: boolean;
}

export function FileUploadZone({ onFileRead, isProcessing }: FileUploadZoneProps) {
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
      // Validate file type
      const validTypes = [
        'text/plain',
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
      ];
      const validExtensions = ['.txt', '.csv'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
        alert('Please upload a .txt or .csv file only.');
        return;
      }

      setSelectedFile({ name: file.name, size: file.size });

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          onFileRead(content, file.name);
        }
      };
      reader.onerror = () => {
        alert('Failed to read the file. Please try again.');
        setSelectedFile(null);
      };
      reader.readAsText(file);
    },
    [onFileRead]
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
        accept=".txt,.csv"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {isProcessing ? (
        <div className="trade-processing flex flex-col items-center gap-3">
          <div className="trade-upload-icon">⚙️</div>
          <span className="trade-upload-title">Processing file…</span>
          <span className="trade-upload-subtitle">Parsing and validating trade rows</span>
        </div>
      ) : (
        <>
          <div className="trade-upload-icon">📂</div>
          <span className="trade-upload-title">
            {isDragging ? 'Drop your file here' : 'Upload Trade File'}
          </span>
          <span className="trade-upload-subtitle">
            Drag & drop a CSV or text file, or click to browse
          </span>

          <div className="trade-upload-filetag">
            📄 .csv, .txt supported
          </div>

          {selectedFile && (
            <div className="trade-upload-selected">
              <span className="trade-upload-selected-name">✓ {selectedFile.name}</span>
              <span className="trade-upload-selected-size">{formatSize(selectedFile.size)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
