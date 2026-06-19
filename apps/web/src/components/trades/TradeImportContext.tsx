'use client';

import React, { createContext, useContext, useState } from 'react';

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'RESULT';

interface TradeImportContextType {
  step: ImportStep;
  setStep: (step: ImportStep) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  fileName: string;
  setFileName: (fileName: string) => void;
  parsedTrades: any[];
  setParsedTrades: (trades: any[]) => void;
  normalizedRows: any[];
  setNormalizedRows: (rows: any[]) => void;
  previewRows: any[];
  setPreviewRows: (rows: any[]) => void;
  importResult: { importedCount: number; failedCount: number } | null;
  setImportResult: (result: { importedCount: number; failedCount: number } | null) => void;
  selectedExchangeId: string;
  setSelectedExchangeId: (id: string) => void;
  selectedBrokerId: string;
  setSelectedBrokerId: (id: string) => void;
  selectedImportType: string;
  setSelectedImportType: (type: string) => void;
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

  const resetImportState = () => {
    setStep('UPLOAD');
    setFileName('');
    setParsedTrades([]);
    setNormalizedRows([]);
    setPreviewRows([]);
    setImportResult(null);
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
