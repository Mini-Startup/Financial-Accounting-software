'use client';

import React from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { round } from '@/utils/brokerage';
import { formatCurrencySymbol } from '@/utils/currency';
import { CustomSelect } from '../ui/CustomSelect';

export interface ScriptRuleRow {
  scriptId: string;
  shortName: string;
  fullName: string;
  exchangeCode: string;
  currencySymbol?: string;
  marketLot: number; // READ ONLY
  mode: 'BOTH' | 'SPLIT';
  bothQuantity: number | string;
  bothBrokerage: number | string;
  buyActive: boolean;
  buyQuantity: number | string;
  buyBrokerage: number | string;
  sellActive: boolean;
  sellQuantity: number | string;
  sellBrokerage: number | string;
}

interface AllScriptsBrokerageTableProps {
  rows: ScriptRuleRow[];
  onRowChange: (updatedRow: ScriptRuleRow) => void;
}

export function AllScriptsBrokerageTable({
  rows,
  onRowChange,
}: AllScriptsBrokerageTableProps) {
  const configuredCount = rows.filter((r) => {
    if (r.mode === 'BOTH') {
      const b = parseFloat(String(r.bothBrokerage || '0'));
      return !isNaN(b) && b > 0;
    }
    const bBuy = r.buyActive ? parseFloat(String(r.buyBrokerage || '0')) : 0;
    const bSell = r.sellActive ? parseFloat(String(r.sellBrokerage || '0')) : 0;
    return (!isNaN(bBuy) && bBuy > 0) || (!isNaN(bSell) && bSell > 0);
  }).length;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2">
      {/* Script Count Header */}
      <div className="flex items-center justify-between text-xs px-1 shrink-0">
        <span className="text-[var(--color-slate)]">
          All <strong>{rows.length}</strong> scripts loaded from database
        </span>
        <span className="font-semibold text-[var(--color-forest)] bg-[var(--color-mist)]/60 px-2.5 py-0.5 rounded-full">
          {configuredCount} scripts configured
        </span>
      </div>

      {/* Table Container */}
      <div className="border border-[var(--color-border-light)] rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col bg-white shadow-2xs">
        <div className="overflow-y-auto flex-1 pb-12">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-[var(--color-snow)] text-[var(--color-slate)] border-b border-[var(--color-border-light)] text-[11px] font-bold uppercase tracking-wider select-none sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 text-center" style={{ width: '45px' }}>
                  #
                </th>
                <th className="py-2.5 px-3" style={{ width: '120px' }}>
                  Script
                </th>
                <th className="py-2.5 px-3" style={{ width: '160px' }}>
                  Full Name
                </th>
                <th className="py-2.5 px-3 text-center" style={{ width: '90px' }}>
                  Exchange
                </th>
                <th className="py-2.5 px-3 text-right" style={{ width: '100px' }}>
                  Market Lot
                </th>
                <th className="py-2.5 px-3 text-center" style={{ width: '110px' }}>
                  Direction
                </th>
                <th className="py-2.5 px-3">
                  Brokerage Rule Configuration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--color-slate)] italic">
                    <div className="flex flex-col items-center gap-1.5">
                      <AlertCircle className="w-5 h-5 text-slate-400" />
                      <span>No scripts found in system.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isBoth = row.mode === 'BOTH';
                  const isConfigured = isBoth
                    ? parseFloat(String(row.bothBrokerage || '0')) > 0
                    : (row.buyActive && parseFloat(String(row.buyBrokerage || '0')) > 0) ||
                      (row.sellActive && parseFloat(String(row.sellBrokerage || '0')) > 0);

                  // Calculate live rates
                  const bothQ = parseFloat(String(row.bothQuantity || '1'));
                  const bothB = parseFloat(String(row.bothBrokerage || '0'));
                  const bothPerUnit =
                    !isNaN(bothQ) && bothQ > 0 && !isNaN(bothB) && bothB >= 0
                      ? round(bothB / bothQ, 4).toFixed(4)
                      : null;

                  const buyQ = parseFloat(String(row.buyQuantity || '1'));
                  const buyB = parseFloat(String(row.buyBrokerage || '0'));
                  const buyPerUnit =
                    !isNaN(buyQ) && buyQ > 0 && !isNaN(buyB) && buyB >= 0
                      ? round(buyB / buyQ, 4).toFixed(4)
                      : null;

                  const sellQ = parseFloat(String(row.sellQuantity || '1'));
                  const sellB = parseFloat(String(row.sellBrokerage || '0'));
                  const sellPerUnit =
                    !isNaN(sellQ) && sellQ > 0 && !isNaN(sellB) && sellB >= 0
                      ? round(sellB / sellQ, 4).toFixed(4)
                      : null;

                  const rowSym = formatCurrencySymbol(row.currencySymbol);

                  const handleDirectionChange = (val: string) => {
                    if (val === 'BOTH') {
                      onRowChange({
                        ...row,
                        mode: 'BOTH',
                      });
                    } else {
                      // Selecting Buy or Sell immediately activates BOTH Buy & Sell in the row!
                      onRowChange({
                        ...row,
                        mode: 'SPLIT',
                        buyActive: true,
                        sellActive: true,
                      });
                    }
                  };

                  return (
                    <tr
                      key={row.scriptId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isConfigured ? 'bg-emerald-50/15' : ''
                      }`}
                    >
                      {/* 1. # */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. Script Code */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-charcoal)]">
                        {row.shortName}
                      </td>

                      {/* 3. Full Name (Read-only) */}
                      <td
                        className="py-2.5 px-3 text-[var(--color-slate)] max-w-[160px] truncate"
                        title={row.fullName}
                      >
                        {row.fullName || '—'}
                      </td>

                      {/* 4. Exchange (Read-only badge) */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="badge badge--neutral text-[10px] font-mono font-bold">
                          {row.exchangeCode || '—'}
                        </span>
                      </td>

                      {/* 5. Market Lot (Read-only data, NOT rule quantity) */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-600">
                        {row.marketLot || 1}
                      </td>

                      {/* 6. Direction Dropdown */}
                      <td className="py-2.5 px-3 text-center">
                        <CustomSelect<string>
                          value={
                            row.mode === 'BOTH'
                              ? 'BOTH'
                              : row.buyActive && row.sellActive
                              ? 'SPLIT'
                              : row.buyActive
                              ? 'BUY'
                              : 'SELL'
                          }
                          options={[
                            { value: 'BOTH', label: 'Both' },
                            { value: 'BUY', label: 'Buy' },
                            { value: 'SELL', label: 'Sell' },
                            ...(row.mode === 'SPLIT' && row.buyActive && row.sellActive
                              ? [{ value: 'SPLIT', label: 'Buy & Sell' }]
                              : []),
                          ]}
                          onChange={(val) => handleDirectionChange(val)}
                          size="xs"
                          menuWidth={110}
                          triggerClassName="w-24 justify-between"
                        />
                      </td>

                      {/* 7. Rule Configuration Area */}
                      <td className="py-2 px-3">
                        {row.mode === 'BOTH' ? (
                          /* BOTH Mode */
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--color-slate)] font-medium">Rule Qty:</span>
                              <input
                                type="number"
                                step="any"
                                min="0.0001"
                                value={row.bothQuantity}
                                onChange={(e) =>
                                  onRowChange({ ...row, bothQuantity: e.target.value })
                                }
                                placeholder="1"
                                className="input text-xs font-mono font-bold w-20 text-right py-1 px-2"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[var(--color-slate)] font-medium">Brokerage:</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={row.bothBrokerage}
                                onChange={(e) =>
                                  onRowChange({ ...row, bothBrokerage: e.target.value })
                                }
                                placeholder="0.00"
                                className={`input text-xs font-mono font-bold w-24 text-right py-1 px-2 ${
                                  bothB > 0 ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900' : ''
                                }`}
                              />
                            </div>

                            {bothPerUnit && (
                              <div className="text-[11px] font-mono font-bold text-[var(--color-forest)] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                {rowSym}{bothPerUnit} / quantity
                              </div>
                            )}
                          </div>
                        ) : (
                          /* SPLIT (Buy & Sell) Mode with Color Tints and Cross Icons */
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {/* BUY Section (Light Green Tint) */}
                            {row.buyActive && (
                              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-2xs">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-700 text-white tracking-wider">
                                  BUY
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-emerald-900 font-medium">Qty:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0.0001"
                                    value={row.buyQuantity}
                                    onChange={(e) =>
                                      onRowChange({ ...row, buyQuantity: e.target.value })
                                    }
                                    placeholder="1"
                                    className="input text-xs font-mono font-bold w-16 text-right py-0.5 px-1 bg-white border-emerald-300"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-emerald-900 font-medium">Brk:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.buyBrokerage}
                                    onChange={(e) =>
                                      onRowChange({ ...row, buyBrokerage: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="input text-xs font-mono font-bold w-20 text-right py-0.5 px-1 bg-white border-emerald-300"
                                  />
                                </div>
                                {buyPerUnit && (
                                  <span className="font-mono text-[11px] font-bold text-emerald-800">
                                    {rowSym}{buyPerUnit} / qty
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRowChange({ ...row, buyActive: false })
                                  }
                                  title="Remove Buy brokerage rule"
                                  className="p-1 text-emerald-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* SELL Section (Light Red Tint) */}
                            {row.sellActive && (
                              <div className="bg-rose-50/80 border border-rose-200/90 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-2xs">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-700 text-white tracking-wider">
                                  SELL
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-rose-900 font-medium">Qty:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0.0001"
                                    value={row.sellQuantity}
                                    onChange={(e) =>
                                      onRowChange({ ...row, sellQuantity: e.target.value })
                                    }
                                    placeholder="1"
                                    className="input text-xs font-mono font-bold w-16 text-right py-0.5 px-1 bg-white border-rose-300"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-rose-900 font-medium">Brk:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.sellBrokerage}
                                    onChange={(e) =>
                                      onRowChange({ ...row, sellBrokerage: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="input text-xs font-mono font-bold w-20 text-right py-0.5 px-1 bg-white border-rose-300"
                                  />
                                </div>
                                {sellPerUnit && (
                                  <span className="font-mono text-[11px] font-bold text-rose-800">
                                    {rowSym}{sellPerUnit} / qty
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRowChange({ ...row, sellActive: false })
                                  }
                                  title="Remove Sell brokerage rule"
                                  className="p-1 text-rose-600 hover:text-rose-900 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Re-add Buy or Sell buttons if one was crossed out */}
                            {!row.buyActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRowChange({ ...row, buyActive: true })
                                }
                                className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Buy</span>
                              </button>
                            )}

                            {!row.sellActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRowChange({ ...row, sellActive: true })
                                }
                                className="text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-dashed border-rose-300 px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Sell</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
