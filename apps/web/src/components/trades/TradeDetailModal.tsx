'use client';

import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, TrendingUp, Cpu, Info, Pencil, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

export function TradeDetailModal({
  trade,
  onClose,
  onEdit,
}: {
  trade: any;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);

  const formattedDate = new Date(trade.tradeDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const profit = trade.profitTotal ?? 0;

  const isLocked = Boolean(
    trade.isSettlementGenerated ||
    trade.tradeType === 'SETTLEMENT' ||
    trade.tradeType === 'CARRY_FORWARD' ||
    trade.tradeType === 'BACK_FORWARD' ||
    trade.settlementId
  );
  
  const currSym = trade.script?.currency?.symbol || (
    (trade.script?.currency?.code || trade.currencyCode || '').toUpperCase() === 'INR' ? '₹' :
    (trade.script?.currency?.code || trade.currencyCode || '').toUpperCase() === 'USD' ? '$' :
    (trade.script?.currency?.code || trade.currencyCode || '').toUpperCase() === 'AED' ? 'AED ' :
    (trade.script?.currency?.code || trade.currencyCode || '').toUpperCase() === 'EUR' ? '€' :
    (trade.script?.currency?.code || trade.currencyCode || '').toUpperCase() === 'GBP' ? '£' :
    (trade.currencyCode ? `${trade.currencyCode} ` : '$')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="card w-[820px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-[var(--color-border-light)] bg-white rounded-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border-light)] bg-[var(--color-snow)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-mist)] border border-[var(--color-leaf)]/30 flex items-center justify-center text-[var(--color-forest)]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[var(--color-forest)] bg-[var(--color-mist)] border border-[var(--color-leaf)]/40 rounded-full px-2.5 py-0.5">
                  #{trade.tradeNumber}
                </span>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-full px-2 py-0.5">
                    <Lock className="w-3 h-3 text-amber-600" /> Locked Record
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full px-2 py-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active Trade
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-[var(--color-charcoal)] font-display mt-0.5">
                Trade Specifications
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="btn btn--secondary flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold cursor-pointer"
                title="Edit this trade"
              >
                <Pencil className="w-3.5 h-3.5 text-[var(--color-forest)]" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lock Banner if Settlement Generated */}
          {isLocked && (
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3.5 text-amber-900 text-xs shadow-xs">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-950 text-sm">Automated Settlement Trade (Read-Only)</div>
                <p className="text-amber-800 leading-relaxed">
                  This transaction was generated during Settlement Cycle #{trade.settlementId?.slice(0, 8) || ''} as a {trade.tradeType?.replace('_', ' ')}. To protect double-entry ledger balance integrity, direct editing and deletion of this trade are permanently disabled.
                </p>
              </div>
            </div>
          )}
          {/* Section 1: Core Trade Details */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
              Core Execution Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Exchange</span>
                <span className="font-bold text-[var(--color-charcoal)]">{trade.exchange?.code || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Script / Symbol</span>
                <span className="font-semibold text-[var(--color-charcoal)]">{trade.script?.fullName || trade.script?.shortName || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Transaction</span>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1',
                    trade.transactionType === 'BUY'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  )}
                >
                  {trade.transactionType}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Trade Type</span>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1 border',
                    trade.tradeType === 'CARRY_FORWARD' && 'bg-amber-50 text-amber-800 border-amber-200',
                    trade.tradeType === 'BACK_FORWARD' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    trade.tradeType === 'SETTLEMENT' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    trade.tradeType === 'INTERNAL' && 'bg-blue-50 text-blue-700 border-blue-200',
                    (!trade.tradeType || trade.tradeType === 'REGULAR') && 'bg-slate-50 text-slate-700 border-slate-200'
                  )}
                >
                  {trade.tradeType === 'CARRY_FORWARD'
                    ? 'Carry Forward'
                    : trade.tradeType === 'BACK_FORWARD'
                    ? 'Backforward'
                    : trade.tradeType === 'SETTLEMENT'
                    ? 'Settlement'
                    : trade.tradeType === 'INTERNAL'
                    ? 'Internal Trade'
                    : trade.tradeType || 'Regular'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Quantity</span>
                <span className="font-mono font-bold text-[var(--color-charcoal)]">{trade.quantity}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Calculations & Spreads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Column */}
            <div className="bg-[var(--color-snow)] border border-[var(--color-border-light)] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-[var(--color-charcoal)] uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                <span>Client Side</span>
                <span className="text-xs font-normal text-[var(--color-slate)] font-mono">{trade.account?.code || '—'}</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-slate)]">Market Rate</span>
                  <span className="font-mono">{currSym}{trade.rate?.toFixed(4) || '0.0000'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-slate)]">Effective Client Rate</span>
                  <span className="font-mono font-semibold text-[var(--color-charcoal)]">
                    {currSym}{trade.clientRate?.toFixed(4) || trade.rate?.toFixed(4) || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-1">
                  <span className="text-[var(--color-slate)]">Computed Brokerage</span>
                  <span className="font-mono text-emerald-600">
                    {trade.clientBrokerage != null ? `${currSym}${trade.clientBrokerage.toFixed(4)}` : 'Fixed / Invoice'}
                  </span>
                </div>
              </div>
            </div>

            {/* Broker Column */}
            <div className="bg-[var(--color-snow)] border border-[var(--color-border-light)] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-[var(--color-charcoal)] uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                <span>Broker Side</span>
                <span className="text-xs font-normal text-[var(--color-slate)] font-mono">{trade.broker?.code || '—'}</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-slate)]">Market Rate</span>
                  <span className="font-mono">{currSym}{trade.rate?.toFixed(4) || '0.0000'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-slate)]">Effective Broker Rate</span>
                  <span className="font-mono font-semibold text-[var(--color-charcoal)]">
                    {currSym}{trade.brokerRate?.toFixed(4) || trade.rate?.toFixed(4) || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-1">
                  <span className="text-[var(--color-slate)]">Computed Brokerage</span>
                  <span className="font-mono text-emerald-600">
                    {trade.brokerBrokerage != null ? `${currSym}${trade.brokerBrokerage.toFixed(4)}` : 'Fixed / Invoice'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Spread Profit Container */}
          <div
            className={cn(
              'border rounded-xl p-4',
              profit > 0
                ? 'bg-[var(--color-mist)] border-[var(--color-leaf)] text-[var(--color-forest)]'
                : profit < 0
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            )}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                Net Trade Spread Profit
              </span>
              <span className="font-mono text-xl font-bold">
                {profit > 0 ? '+' : ''}{currSym}{profit.toFixed(4)}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-slate)] mt-1">
              Spread value calculated as quantity ({trade.quantity}) multiplied by client-broker rate difference.
            </p>
          </div>

          {/* Section 3: Extended Specifications (Dubai / FnO Import Details) */}
          {(trade.securityName || trade.dealerCode || trade.currencyCode || trade.delMonth || trade.bloombergCode || trade.mktValue != null) && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Extended Trade Specifications
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
                <div>
                  <span className="text-[11px] text-slate-500 block">Security Name</span>
                  <span className="font-semibold text-slate-800 text-xs">{trade.securityName || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Dealer Code</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">{trade.dealerCode || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Currency</span>
                  <span className="font-mono text-xs text-slate-800">{trade.currencyCode || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Delivery Month</span>
                  <span className="font-mono text-xs text-slate-800">{trade.delMonth || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Market Lot</span>
                  <span className="font-mono text-xs text-slate-800">{trade.marketLot != null ? trade.marketLot : '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Call / Put</span>
                  <span className="font-mono text-xs text-slate-800">{trade.callPut || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Strike Price</span>
                  <span className="font-mono text-xs text-slate-800">{trade.strikePrice != null ? trade.strikePrice : '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Bloomberg Code</span>
                  <span className="font-mono text-xs text-slate-800">{trade.bloombergCode || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Mkt Value</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">{trade.mktValue != null ? `₹${trade.mktValue.toFixed(2)}` : '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Commission</span>
                  <span className="font-mono text-xs text-slate-800">{trade.clnCommission != null ? `₹${trade.clnCommission.toFixed(2)}` : '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Ex Charges</span>
                  <span className="font-mono text-xs text-slate-800">{trade.clnExCharges != null ? `₹${trade.clnExCharges.toFixed(2)}` : '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Charges 1 / 2 / VAT</span>
                  <span className="font-mono text-xs text-slate-800">
                    {`₹${((trade.clnCharges1 || 0) + (trade.clnCharges2 || 0) + (trade.vat || 0)).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Technical / File Mappings */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[var(--color-primary)]" />
              Audit & System Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Data Source</span>
                <span className="badge badge--neutral mt-1">{trade.source || 'MANUAL'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Date & Time</span>
                <span className="font-mono text-xs">{formattedDate} {trade.tradeTime || ''}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Terminal Code</span>
                <span className="font-mono text-xs">{trade.terminal || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Expiry Date</span>
                <span className="font-mono text-xs">{trade.expiry || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Order ID</span>
                <span className="font-mono text-xs">{trade.orderId || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Unique Trade ID</span>
                <span className="font-mono text-xs">{trade.uniqueTradeId || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Exchange Time</span>
                <span className="font-mono text-xs">{trade.exchangeTime || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-slate)] block">Order Time</span>
                <span className="font-mono text-xs">{trade.orderTime || '—'}</span>
              </div>
            </div>

            {trade.remarks && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <span className="text-[11px] text-[var(--color-slate)] block">Remarks</span>
                <p className="text-xs text-[var(--color-charcoal)] mt-0.5">{trade.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border-light)] bg-[var(--color-snow)] flex justify-end shrink-0">
          <button onClick={onClose} className="btn btn--secondary">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
