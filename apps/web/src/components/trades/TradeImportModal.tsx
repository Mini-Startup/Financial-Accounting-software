'use client';

import React, { useState } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useTradeImport } from './TradeImportContext';
import { TradeImportManager } from './TradeImportManager';
import { X, UploadCloud, RotateCcw, AlertTriangle, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface TradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialFile?: File | null;
}

export function TradeImportModal({ isOpen, onClose, onComplete, initialFile }: TradeImportModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150 select-none"
    >
      <div
        ref={modalRef}
        className={cn(
          "flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-200",
          step === 'PREVIEW'
            ? "w-[98vw] max-w-7xl h-[94vh] max-h-[94vh]"
            : "w-full max-w-xl max-h-[88vh]"
        )}
      >
        {/* ── Modal Executive Header ────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2652C8] shadow-2xs">
              <UploadCloud className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900 font-display">
                  Import Trades
                </h2>
                {hasActiveImport && step === 'PREVIEW' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 rounded-full px-2.5 py-0.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Data Preserved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Upload Excel or CSV trades, validate mappings, and commit transactions directly to the ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveImport && step === 'PREVIEW' && (
              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Discard parsed trades and upload another file"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Close dialog (retains uploaded data)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Body hosting TradeImportManager ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/50">
          <TradeImportManager onBack={handleFinish} initialFile={initialFile} />
        </div>
      </div>

      {/* Confirmation dialog for manually resetting import state */}
      <ConfirmDialog
        isOpen={isConfirmResetOpen}
        title="Discard Active Import"
        message={
          <div>
            <p>Are you sure you want to cancel the current import and discard parsed trade data?</p>
            <p className="text-xs text-slate-500 mt-2">
              All parsed rows from <strong className="font-mono">{fileName || 'the uploaded file'}</strong> will be removed.
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
