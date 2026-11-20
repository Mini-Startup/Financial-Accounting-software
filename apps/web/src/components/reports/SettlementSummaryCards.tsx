'use client';

import React from 'react';
import { Scale, CheckCircle2, AlertCircle, IndianRupee, Users, Briefcase } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SettlementSummaryCardsProps {
  reconciliation: {
    totalClientNet: number;
    totalBrokerNet: number;
    firmBrokerageSpread: number;
    firmTradingMargin: number;
    firmNetRealizedProfit: number;
    imbalanceDelta: number;
    isBalanced: boolean;
  };
  clientTotals: {
    totalBuyValue: number;
    totalSellValue: number;
    grossTradingPnL: number;
    totalBrokerage: number;
    netReceivable: number;
    netPayable: number;
    netSettlementAmount: number;
  };
  brokerTotals: {
    totalBuyValue: number;
    totalSellValue: number;
    netTradingAmount: number;
    totalCharges: number;
    netPayable: number;
    netReceivable: number;
    netSettlementAmount: number;
  };
}

export function SettlementSummaryCards({
  reconciliation,
  clientTotals,
  brokerTotals,
}: SettlementSummaryCardsProps) {
  const isFirmProfitPositive = reconciliation.firmNetRealizedProfit > 0;
  const isFirmProfitNegative = reconciliation.firmNetRealizedProfit < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ─── CARD 1: CLIENT NET CLEARING ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Client Net Clearing
          </span>
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-[#2652C8] shadow-2xs">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              clientTotals.netSettlementAmount > 0 && 'text-emerald-700',
              clientTotals.netSettlementAmount < 0 && 'text-rose-700',
              clientTotals.netSettlementAmount === 0 && 'text-slate-900'
            )}
          >
            {clientTotals.netSettlementAmount > 0 ? '+' : ''}₹
            {clientTotals.netSettlementAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {clientTotals.netSettlementAmount > 0 ? 'Cr (Payable)' : clientTotals.netSettlementAmount < 0 ? 'Dr (Receivable)' : 'Balanced'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono font-medium pt-2 border-t border-slate-100">
          <span>Dr: ₹{clientTotals.netReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span>Cr: ₹{clientTotals.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* ─── CARD 2: BROKER NET CLEARING ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Broker Net Clearing
          </span>
          <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl text-purple-700 shadow-2xs">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              brokerTotals.netSettlementAmount > 0 && 'text-emerald-700',
              brokerTotals.netSettlementAmount < 0 && 'text-rose-700',
              brokerTotals.netSettlementAmount === 0 && 'text-slate-900'
            )}
          >
            {brokerTotals.netSettlementAmount > 0 ? '+' : ''}₹
            {brokerTotals.netSettlementAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {brokerTotals.netSettlementAmount > 0 ? 'Cr (Payable)' : brokerTotals.netSettlementAmount < 0 ? 'Dr (Receivable)' : 'Balanced'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono font-medium pt-2 border-t border-slate-100">
          <span>Dr: ₹{brokerTotals.netReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span>Cr: ₹{brokerTotals.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* ─── CARD 3: FIRM NET PROFIT ───────────────────────────────────────── */}
      <div
        className={cn(
          'border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors bg-white',
          isFirmProfitPositive && 'border-emerald-200 ring-1 ring-emerald-500/10',
          isFirmProfitNegative && 'border-rose-200 ring-1 ring-rose-500/10',
          !isFirmProfitPositive && !isFirmProfitNegative && 'border-slate-200/90'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Firm Realized Profit
          </span>
          <div
            className={cn(
              'p-2 rounded-xl shadow-2xs',
              isFirmProfitPositive && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
              isFirmProfitNegative && 'bg-rose-50 text-rose-700 border border-rose-200',
              !isFirmProfitPositive && !isFirmProfitNegative && 'bg-slate-50 text-slate-600 border border-slate-200'
            )}
          >
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              isFirmProfitPositive && 'text-emerald-700',
              isFirmProfitNegative && 'text-rose-700',
              !isFirmProfitPositive && !isFirmProfitNegative && 'text-slate-900'
            )}
          >
            {isFirmProfitPositive ? '+' : ''}₹
            {reconciliation.firmNetRealizedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono font-medium pt-2 border-t border-slate-100">
          <span>Brokerage: +₹{reconciliation.firmBrokerageSpread.toFixed(2)}</span>
          <span>Spread: ₹{reconciliation.firmTradingMargin.toFixed(2)}</span>
        </div>
      </div>

      {/* ─── CARD 4: DOUBLE-ENTRY EQUILIBRIUM BADGE ────────────────────────── */}
      <div
        className={cn(
          'border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors',
          reconciliation.isBalanced
            ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-500/10'
            : 'bg-rose-50/60 border-rose-200 ring-1 ring-rose-500/10'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Double-Entry Equilibrium
          </span>
          <div
            className={cn(
              'p-2 rounded-xl shadow-2xs',
              reconciliation.isBalanced
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            )}
          >
            <Scale className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2">
          {reconciliation.isBalanced ? (
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-sm">Perfect Balance (0.00)</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Δ = Client + Broker + Firm ≡ ₹0.00
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold text-sm">Imbalance Alert</p>
                <p className="text-xs text-rose-700 mt-0.5 font-mono">
                  Δ = ₹{reconciliation.imbalanceDelta.toFixed(2)} discrepancy
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 font-medium">
          Standard accounting audit proof
        </p>
      </div>
    </div>
  );
}
