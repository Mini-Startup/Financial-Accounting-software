'use client';

import React from 'react';
import { Scale, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ClientSummaryRow } from './ClientSummarySection';
import type { BrokerSummaryRow } from './BrokerSummarySection';

interface SettlementBalanceSheetProps {
  settlementName: string;
  fromDate: string;
  toDate: string;
  clientRows: ClientSummaryRow[];
  brokerRows?: BrokerSummaryRow[];
  viewMode?: 'CLIENT' | 'BROKER';
}

export function SettlementBalanceSheetTable({
  settlementName,
  fromDate,
  toDate,
  clientRows = [],
  brokerRows = [],
  viewMode = 'CLIENT',
}: SettlementBalanceSheetProps) {
  // Build unified counterparty rows
  const isClientMode = viewMode === 'CLIENT';
  const rawRows = isClientMode
    ? clientRows.map((c) => ({
        id: c.accountId,
        code: c.accountCode,
        name: c.accountName,
        netAmount: Math.abs(c.netAmount),
        type: c.type, // 'Dr' or 'Cr'
      }))
    : brokerRows.map((b) => ({
        id: b.brokerId,
        code: b.brokerCode,
        name: b.brokerName,
        netAmount: Math.abs(b.netAmount),
        type: b.type, // 'Dr' or 'Cr'
      }));

  let sumDebit = 0;
  let sumCredit = 0;

  const rowsWithDebitsCredits = rawRows.map((r) => {
    const isDr = r.type === 'Dr';
    const isCr = r.type === 'Cr';
    const debit = isDr ? r.netAmount : null;
    const credit = isCr ? r.netAmount : null;

    if (debit) sumDebit += debit;
    if (credit) sumCredit += credit;

    return {
      ...r,
      debit,
      credit,
    };
  });

  // Calculate the balancing Brokerage Account (ZZZZ) difference
  const variance = Math.round((sumDebit - sumCredit) * 100) / 100;
  let brokerageDebit: number | null = null;
  let brokerageCredit: number | null = null;

  if (variance > 0) {
    // Debits exceed Credits: Brokerage Account balances on Credit side
    brokerageCredit = variance;
    sumCredit += variance;
  } else if (variance < 0) {
    // Credits exceed Debits: Brokerage Account balances on Debit side
    brokerageDebit = Math.abs(variance);
    sumDebit += Math.abs(variance);
  }

  const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Title Header */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8] shadow-2xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {settlementName || 'Futures Settlement'} From {fromDate} to {toDate}
            </h3>
            <p className="text-[11px] text-slate-500 font-normal">
              {isClientMode ? 'Client' : 'Broker'} Settlement Clearing &amp; Double-Entry Trial Balance
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Balanced Equilibrium
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/95 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider select-none">
              <th className="py-2.5 px-6 text-left">{isClientMode ? 'Client Name' : 'Broker Name'}</th>
              <th className="py-2.5 px-6 text-left font-mono">Code</th>
              <th className="py-2.5 px-6 text-right font-mono text-slate-900">Debit</th>
              <th className="py-2.5 px-6 text-right font-mono text-slate-900">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {rowsWithDebitsCredits.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2 px-6 font-sans font-semibold text-slate-900">
                  {row.name}
                </td>
                <td className="py-2 px-6 font-bold text-slate-600">
                  {row.code}
                </td>
                <td className="py-2 px-6 text-right text-slate-900 font-semibold">
                  {row.debit !== null ? formatNum(row.debit) : '—'}
                </td>
                <td className="py-2 px-6 text-right text-rose-600 font-semibold">
                  {row.credit !== null ? formatNum(row.credit) : '—'}
                </td>
              </tr>
            ))}

            {/* Brokerage Account Balancing Entry */}
            <tr className="bg-blue-50/40 hover:bg-blue-50/60 transition-colors font-semibold border-t border-slate-200">
              <td className="py-2.5 px-6 font-sans font-bold text-[#2652C8]">
                Brokerage Account
              </td>
              <td className="py-2.5 px-6 font-bold text-[#2652C8]">
                ZZZZ
              </td>
              <td className="py-2.5 px-6 text-right font-bold text-[#2652C8]">
                {brokerageDebit !== null ? formatNum(brokerageDebit) : '—'}
              </td>
              <td className="py-2.5 px-6 text-right font-bold text-[#2652C8]">
                {brokerageCredit !== null ? formatNum(brokerageCredit) : '—'}
              </td>
            </tr>

            {/* Total Row */}
            <tr className="bg-slate-50 border-t-2 border-b-2 border-slate-300 font-bold text-slate-900 text-sm">
              <td className="py-3 px-6 font-bold font-sans">
                Total...
              </td>
              <td className="py-3 px-6"></td>
              <td className="py-3 px-6 text-right font-mono font-extrabold text-slate-900">
                {formatNum(sumDebit)}
              </td>
              <td className="py-3 px-6 text-right font-mono font-extrabold text-slate-900">
                {formatNum(sumCredit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
