'use client';

import React, { useState } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useTradeImport } from './TradeImportContext';
import { TradeImportManager } from './TradeImportManager';
import { X, FileSpreadsheet, RotateCcw, UploadCloud, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface TradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function TradeImportModal({ isOpen, onClose, onComplete }: TradeImportModalProps) {
  useScrollLock(isOpen);
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const { step, fileName, parsedTrades, previewRows, dubaiPreviewRows, resetImportState } = useTradeImport();
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  if (!isOpen) return null;

  const totalRowCount = dubaiPreviewRows.length > 0 ? dubaiPreviewRows.length : previewRows.length;
  const hasActiveImport = Boolean(fileName || totalRowCount > 0 || parsedTrades.length > 0);

  const handleManualReset = () => {
    resetImportState();
    setIsConfirmResetOpen(false);
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete();
    } else {
      onClose();
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className={cn(
          "flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200",
          step === 'PREVIEW'
            ? "w-[98vw] max-w-7xl h-[92vh] max-h-[92vh]"
            : "w-full max-w-xl max-h-[85vh]"
        )}
      >
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <UploadCloud className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Import Trades</h2>
                {hasActiveImport && step === 'PREVIEW' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
                    Data Preserved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Upload Excel or CSV trades, validate mappings, and commit transactions directly to the ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body hosting TradeImportManager */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30">
          <TradeImportManager onBack={handleFinish} />
        </div>
      </div>

      {/* Confirmation dialog for manually resetting import state */}
      <ConfirmDialog
        isOpen={isConfirmResetOpen}
        title="Cancel Active Import"
        message={
          <div>
            <p>Are you sure you want to cancel the current import and discard parsed trade data?</p>
            <p className="text-xs text-slate-500 mt-2">
              All parsed rows from <strong className="font-mono">{fileName || 'the uploaded file'}</strong> will be removed. You will need to upload the file again.
            </p>
          </div>
        }
        confirmLabel="Discard &amp; Reset"
        variant="danger"
        onConfirm={handleManualReset}
        onCancel={() => setIsConfirmResetOpen(false)}
      />
    </div>
  );
}
