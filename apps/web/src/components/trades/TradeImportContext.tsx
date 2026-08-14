'use client';

import React, { createContext, useContext, useState } from 'react';
import type { DubaiParsedTrade } from '../../lib/tradeParser';

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'RESULT';

interface TradeImportContextType {
  step: ImportStep;
  setStep: React.Dispatch<React.SetStateAction<ImportStep>>;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  parsedTrades: any[];
  setParsedTrades: React.Dispatch<React.SetStateAction<any[]>>;
  normalizedRows: any[];
  setNormalizedRows: React.Dispatch<React.SetStateAction<any[]>>;
  previewRows: any[];
  setPreviewRows: React.Dispatch<React.SetStateAction<any[]>>;
  importResult: { importedCount: number; failedCount: number } | null;
  setImportResult: React.Dispatch<React.SetStateAction<{ importedCount: number; failedCount: number } | null>>;
  selectedExchangeId: string;
  setSelectedExchangeId: React.Dispatch<React.SetStateAction<string>>;
  selectedBrokerId: string;
  setSelectedBrokerId: React.Dispatch<React.SetStateAction<string>>;
  selectedImportType: string;
  setSelectedImportType: React.Dispatch<React.SetStateAction<string>>;
  // Dubai-specific
  dubaiPreviewRows: DubaiParsedTrade[];
  setDubaiPreviewRows: React.Dispatch<React.SetStateAction<DubaiParsedTrade[]>>;
  resetImportState: () => void;
}


const TradeImportContext = createContext<TradeImportContextType | undefined>(undefined);

export function TradeImportProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedTrades, setParsedTrades] = useState<any[]>([]);
  const [normalizedRows, setNormalizedRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ importedCount: number; failedCount: number } | null>(null);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
  const [selectedImportType, setSelectedImportType] = useState<string>('trades_fno');
  const [dubaiPreviewRows, setDubaiPreviewRows] = useState<DubaiParsedTrade[]>([]);

  const resetImportState = () => {
    setStep('UPLOAD');
    setFileName('');
    setParsedTrades([]);
    setNormalizedRows([]);
    setPreviewRows([]);
    setImportResult(null);
    setDubaiPreviewRows([]);
  };

  return (
    <TradeImportContext.Provider
      value={{
        step,
        setStep,
        isProcessing,
        setIsProcessing,
        fileName,
        setFileName,
        parsedTrades,
        setParsedTrades,
        normalizedRows,
        setNormalizedRows,
        previewRows,
        setPreviewRows,
        importResult,
        setImportResult,
        selectedExchangeId,
        setSelectedExchangeId,
        selectedBrokerId,
        setSelectedBrokerId,
        selectedImportType,
        setSelectedImportType,
        dubaiPreviewRows,
        setDubaiPreviewRows,
        resetImportState,
      }}
    >
      {children}
    </TradeImportContext.Provider>
  );
}

export function useTradeImport() {
  const context = useContext(TradeImportContext);
  if (context === undefined) {
    throw new Error('useTradeImport must be used within a TradeImportProvider');
  }
  return context;
}
