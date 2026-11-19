'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, X, AlertOctagon, ShieldAlert, Loader2 } from 'lucide-react';

interface ExchangeDeleteModalProps {
  isOpen: boolean;
  exchange: {
    id: string;
    code: string;
    name?: string | null;
  } | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

interface ImpactData {
  exchange: { id: string; code: string; name: string | null };
  activeScriptsCount: number;
  totalTradesCount: number;
  openTradesCount: number;
  canHardDelete: boolean;
  warning?: string;
}

export function ExchangeDeleteModal({
  isOpen,
  exchange,
  onClose,
  onDeleted,
}: ExchangeDeleteModalProps) {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && exchange?.id) {
      setConfirmCodeInput('');
      setIsLoadingImpact(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/exchanges/${exchange.id}/impact`)
        .then((res) => {
          if (!res.ok) throw new Error('Could not load impact analysis');
          return res.json();
        })
        .then((data: ImpactData) => {
          setImpact(data);
        })
        .catch((err) => {
          console.error('Failed to fetch exchange impact:', err);
          toast.error('Could not load deletion impact analysis.');
        })
        .finally(() => {
          setIsLoadingImpact(false);
        });
    } else {
      setImpact(null);
      setConfirmCodeInput('');
    }
  }, [isOpen, exchange]);

  if (!isOpen || !exchange) return null;

  const expectedCode = exchange.code.trim().toUpperCase();
  const isCodeConfirmed = confirmCodeInput.trim().toUpperCase() === expectedCode;

  const handleDelete = async () => {
    if (!isCodeConfirmed || isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/exchanges/${exchange.id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to soft delete exchange');
      }

      toast.success(`Exchange "${exchange.code}" soft-deleted successfully.`);
      onDeleted(exchange.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting exchange');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exchange Deletion Impact Analysis</h3>
              <p className="text-xs text-slate-500">Relational dependency evaluation before soft-delete</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {isLoadingImpact ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Analyzing linked scripts, trades, and import rules...</p>
            </div>
          ) : (
            <>
              {/* Target Details */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Exchange Target</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {exchange.name || exchange.code}
                  </div>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 shadow-xs">
                  {exchange.code}
                </span>
              </div>

              {/* Impact Metrics Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-center">
                  <div className="text-lg font-black text-amber-900 tabular-nums">
                    {impact?.activeScriptsCount ?? 0}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-700 mt-0.5">Active Scripts</div>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl text-center">
                  <div className="text-lg font-black text-rose-900 tabular-nums">
                    {impact?.totalTradesCount ?? 0}
                  </div>
                  <div className="text-[11px] font-semibold text-rose-700 mt-0.5">Total Trades</div>
                </div>
                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-center">
                  <div className="text-lg font-black text-indigo-900 tabular-nums">
                    {impact?.openTradesCount ?? 0}
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">Open Trades</div>
                </div>
              </div>

              {/* Future Import Warning Box */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 space-y-1">
                  <p className="font-semibold">Future Trade Import Warning:</p>
                  <p className="leading-relaxed">
                    Deactivating exchange <strong>{exchange.code}</strong> will preserve historical records via soft delete. However, any future trade CSV/Excel files containing exchange code <strong>{exchange.code}</strong> will be flagged as invalid during file parsing.
                  </p>
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  To confirm deletion, type <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">{exchange.code}</span> below:
                </label>
                <input
                  type="text"
                  value={confirmCodeInput}
                  onChange={(e) => setConfirmCodeInput(e.target.value)}
                  placeholder={`Type ${exchange.code} to confirm`}
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isCodeConfirmed || isDeleting || isLoadingImpact}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs ${
              isCodeConfirmed && !isDeleting && !isLoadingImpact
                ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Soft Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete Exchange</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
