'use client';

import { useState, useCallback } from 'react';
import { parseTradeFile } from '../../lib/tradeParser';
import type { ParseResult } from '../../lib/tradeParser';
import { FileUploadZone } from './FileUploadZone';
import { TradeStatsBar } from './TradeStatsBar';
import { TradeDataGrid } from './TradeDataGrid';
import { TradeErrorPanel } from './TradeErrorPanel';
import './trades-import.css';

export function TradeImportManager() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileRead = useCallback((content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);

    // Use setTimeout to allow the UI to show the processing state
    // before the potentially heavy parse operation blocks the thread
    setTimeout(() => {
      try {
        const parsed = parseTradeFile(content);
        setResult(parsed);
      } catch (err) {
        console.error('Trade parse failed:', err);
        alert('Failed to parse the trade file. Please check the format.');
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  }, []);

  const handleReset = () => {
    setResult(null);
    setFileName('');
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="trade-import-header">
        <h1 className="trade-import-title">
          <span>📥</span>
          Trade File Import
          {fileName && result && (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#64748b',
                marginLeft: '4px',
              }}
            >
              — {fileName}
            </span>
          )}
        </h1>

        <div className="trade-import-actions">
          {result && (
            <>
              <button className="trade-btn-secondary" onClick={handleReset}>
                ↻ Import Another
              </button>
              <button className="trade-btn-primary trade-btn-save" disabled title="Will be enabled when database integration is ready">
                💾 Save to Database
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upload Zone — shown when no data is loaded */}
      {!result && (
        <FileUploadZone onFileRead={handleFileRead} isProcessing={isProcessing} />
      )}

      {/* Results — shown after successful parse */}
      {result && (
        <div className="flex flex-col gap-4 trade-animate-in">
          {/* Stats ribbon */}
          <TradeStatsBar result={result} />

          {/* Error panel (if any errors) */}
          <TradeErrorPanel errors={result.errors} />

          {/* Main data grid */}
          <TradeDataGrid trades={result.trades} />
        </div>
      )}
    </div>
  );
}
