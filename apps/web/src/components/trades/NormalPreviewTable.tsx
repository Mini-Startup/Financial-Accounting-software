'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, CheckSquare, RefreshCw, Plus, Edit3 } from 'lucide-react';
import { TradeRowDrawer } from './TradeRowDrawer';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { CustomSelect } from '../ui/CustomSelect';
import { splitSearchTokens } from '@/utils/tableFilter';
import {
  calculateTradeRates,
  calculateBrokerBrokerage,
  resolveClientRule,
  round,
} from '@/utils/brokerage';

interface NormalPreviewTableProps {
  totalRows: number;
  validFuturesCount: number;
  invalidFuturesCount: number;
  skippedOptionsCount: number;
  futureRows: any[];
  optionRows: any[];
  previewRows: any[];
  setPreviewRows: React.Dispatch<React.SetStateAction<any[]>>;
  normalizedRows: any[];
  setNormalizedRows: React.Dispatch<React.SetStateAction<any[]>>;
  clients: any[];
  exchanges: any[];
  scripts: any[];
  brokerages?: any[];
  isProcessing: boolean;
  handleRevalidate: () => void;
  searchQuery: string;
  searchColumn: string;
  exactMatch: boolean;
  showValidOnly: boolean;
  statusFilter: string;
  onDoubleClickClient: (code: string) => void;
  onDoubleClickScript: (shortName: string, fullName: string, exchangeCode: string) => void;
}

export function NormalPreviewTable({
  totalRows,
  validFuturesCount,
  invalidFuturesCount,
  skippedOptionsCount,
  futureRows,
  optionRows: _optionRows,
  previewRows,
  setPreviewRows,
  setNormalizedRows,
  clients,
  exchanges,
  scripts,
  brokerages,
  isProcessing,
  handleRevalidate,
  searchQuery,
  searchColumn,
  exactMatch,
  showValidOnly,
  statusFilter,
  onDoubleClickClient,
  onDoubleClickScript,
}: NormalPreviewTableProps) {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filteredFutureRows = futureRows.filter((row) => {
    if (showValidOnly && row.status !== 'Valid') return false;
    if (statusFilter === 'VALID' && row.status !== 'Valid') return false;
    if (statusFilter === 'INVALID' && row.status !== 'Invalid') return false;
    if (statusFilter === 'UNMAPPED_CLIENT' && row.resolvedAccountId) return false;
    if (statusFilter === 'UNMAPPED_SCRIPT' && row.resolvedScriptId) return false;
    if (statusFilter === 'UNMAPPED_EXCHANGE' && row.resolvedExchangeId) return false;

    if (!searchQuery.trim()) return true;
    const tokens = splitSearchTokens(searchQuery);
    if (tokens.length === 0) return true;

    const matches = (fieldVal: string | number | null | undefined) => {
      if (fieldVal === null || fieldVal === undefined) return false;
      const target = String(fieldVal).toLowerCase();
      if (exactMatch) {
        return tokens.some((token) => target === token);
      }
      return tokens.some((token) => target.includes(token));
    };

    if (searchColumn === 'clientCode') return matches(row.clientCode);
    if (searchColumn === 'tickCode' || searchColumn === 'securityName') {
      return matches(row.scriptShortName) || matches(row.scriptFullName);
    }
    if (searchColumn === 'marketCode') return matches(row.exchange);
    if (searchColumn === 'orderId') return matches(row.orderId) || matches(row.tradeNumber);
    if (searchColumn === 'tradeDate') return matches(row.tradeDate);
    if (searchColumn === 'quantity') return matches(row.quantity);
    if (searchColumn === 'price') return matches(row.rate);

    return (
      matches(row.clientCode) ||
      matches(row.scriptShortName) ||
      matches(row.scriptFullName) ||
      matches(row.exchange) ||
      matches(row.tradeNumber) ||
      matches(row.terminal) ||
      matches(row.orderId) ||
      matches(row.quantity) ||
      matches(row.rate)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredFutureRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFutureRows = filteredFutureRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Selection calculations (default: deselected)
  const selectedCount = futureRows.filter((r) => r.selected === true).length;
  const isAllFilteredSelected =
    filteredFutureRows.length > 0 && filteredFutureRows.every((r) => r.selected === true);

  const handleToggleSelectAll = () => {
    const target = !isAllFilteredSelected;
    const filteredSet = new Set(filteredFutureRows);
    setPreviewRows((prev) =>
      prev.map((r) => (filteredSet.has(r) ? { ...r, selected: target } : r))
    );
    setNormalizedRows((prev) =>
      prev.map((r) => (filteredSet.has(r) ? { ...r, selected: target } : r))
    );
  };

  const handleToggleRow = (rowIdOrNo: string) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        const id = r.uniqueTradeId || r.tradeNumber;
        if (id === rowIdOrNo) {
          return { ...r, selected: !r.selected };
        }
        return r;
      })
    );
    setNormalizedRows((prev) =>
      prev.map((r) => {
        const id = r.uniqueTradeId || r.tradeNumber;
        if (id === rowIdOrNo) {
          return { ...r, selected: !r.selected };
        }
        return r;
      })
    );
  };

  const handleSelectAllValid = () => {
    setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: r.status === 'Valid' })));
    setNormalizedRows((prev) => prev.map((r) => ({ ...r, selected: r.status === 'Valid' })));
  };

  const handleDeselectAll = () => {
    setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: false })));
    setNormalizedRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const handleCellChange = (index: number, field: string, value: any) => {
    setPreviewRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'clientCode') {
        const found = clients.find((c) => c.code.toUpperCase() === String(value).toUpperCase());
        copy[index].resolvedAccountId = found ? found.id : undefined;
      }
      if (field === 'scriptShortName') {
        copy[index].scriptFullName = value;
      }
      return copy;
    });

    setNormalizedRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'clientCode') {
        const found = clients.find((c) => c.code.toUpperCase() === String(value).toUpperCase());
        copy[index].resolvedAccountId = found ? found.id : undefined;
      }
      if (field === 'scriptShortName') {
        copy[index].scriptFullName = value;
      }
      return copy;
    });
  };

  const selectedRowObj = selectedRowIndex !== null ? previewRows[selectedRowIndex] : null;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Total Rows</div>
              <div className="text-lg font-bold text-[var(--color-charcoal)]">{totalRows}</div>
            </div>
          </div>
        </div>

        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Valid Futures</div>
              <div className="text-lg font-bold text-[var(--color-positive)]">{validFuturesCount}</div>
            </div>
          </div>
        </div>

        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Invalid Futures</div>
              <div className="text-lg font-bold text-[var(--color-negative)]">{invalidFuturesCount}</div>
            </div>
          </div>
        </div>

        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <AlertTriangle className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Options (Skipped)</div>
              <div className="text-lg font-bold text-slate-700">{skippedOptionsCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="flex items-center justify-between text-xs text-[var(--color-slate)] bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
        <span>💡 Tip: Click any row to view &amp; edit trade fields in a side inspector panel. Click &apos;+Map&apos; on unmapped clients/scripts to resolve them.</span>
        <button
          onClick={handleRevalidate}
          disabled={isProcessing}
          className="flex items-center gap-1 text-[var(--color-emerald)] font-semibold hover:underline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} /> Re-run validation
        </button>
      </div>

      {/* Batch Selection & Action Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>{selectedCount}</strong> of {futureRows.length} trades selected for import
            </span>
          </div>

          <button
            type="button"
            onClick={handleSelectAllValid}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
          >
            Select All Valid
          </button>

          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Future Trades Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-charcoal)] flex items-center gap-2">
          <span>📈 Future Trades Preview</span>
          <span className="text-xs font-normal bg-emerald-50 text-[var(--color-emerald)] px-2.5 py-0.5 rounded-full font-mono">
            {validFuturesCount} valid / {futureRows.length} total
          </span>
        </h3>
        <div className="card border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider select-none text-[11px]">
                  <th className="py-3 px-3 text-center" style={{ width: '40px' }}>
                    <CustomCheckbox
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-3">Trade No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Script</th>
                  <th className="py-3 px-3 text-center">Side</th>
                  <th className="py-3 px-3 text-right font-bold">Qty</th>
                  <th className="py-3 px-3 text-right font-bold">Rate</th>

                  {/* 5 Highlighted Columns with slightly darker color, keeping Mkt Value, Client Rate & Broker Rate together */}
                  <th className="py-3 px-3 text-right font-bold bg-slate-200/90 text-slate-800 border-l border-r border-slate-300">
                    Mkt Value
                  </th>
                  <th className="py-3 px-3 text-right font-bold bg-slate-200/90 text-slate-800 border-r border-slate-300">
                    Client Rate
                  </th>
                  <th className="py-3 px-3 text-right font-bold bg-slate-200/90 text-slate-800 border-r border-slate-300">
                    Broker Rate
                  </th>
                  <th className="py-3 px-3 text-right font-bold bg-slate-200/90 text-slate-800 border-r border-slate-300">
                    Client Brk
                  </th>
                  <th className="py-3 px-3 text-right font-bold bg-slate-200/90 text-slate-800 border-r border-slate-300">
                    Broker Brk
                  </th>

                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Terminal</th>
                  <th className="py-3 px-3">Expiry</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedFutureRows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-8 text-center text-slate-400 italic">
                      No matching future trades found.
                    </td>
                  </tr>
                ) : (
                  paginatedFutureRows.map((row) => {
                    const idx = previewRows.findIndex(
                      (r) => r.tradeNumber === row.tradeNumber && r.uniqueTradeId === row.uniqueTradeId
                    );
                    const isBuy = (row.buySell || '').toUpperCase().startsWith('B');
                    const side: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';
                    const qtyNum = Math.abs(parseFloat(String(row.quantity || 0))) || 0;
                    const rateNum = parseFloat(String(row.rate || 0)) || 0;
                    const lotNum =
                      row.marketLot && parseFloat(String(row.marketLot)) > 0
                        ? parseFloat(String(row.marketLot))
                        : 1;

                    const brokerChargesSum = calculateBrokerBrokerage(
                      row.clnCommission ? parseFloat(String(row.clnCommission)) : 0,
                      row.clnExCharges ? parseFloat(String(row.clnExCharges)) : 0,
                      row.clnCharges1 ? parseFloat(String(row.clnCharges1)) : 0,
                      row.clnCharges2 ? parseFloat(String(row.clnCharges2)) : 0
                    );

                    const clientRule = resolveClientRule(
                      brokerages,
                      row.resolvedAccountId,
                      row.resolvedScriptId,
                      side
                    );

                    const calc = calculateTradeRates({
                      rate: rateNum,
                      quantity: qtyNum,
                      marketLot: lotNum,
                      side,
                      clientRule: clientRule
                        ? {
                            quantity: clientRule.quantity,
                            brokerage: clientRule.brokerage,
                            direction: clientRule.direction as any,
                          }
                        : null,
                      brokerBrokerage: brokerChargesSum,
                    });

                    const displayMktValue =
                      (row as any).mktValue && parseFloat(String((row as any).mktValue)) > 0
                        ? parseFloat(String((row as any).mktValue))
                        : calc.marketValue;

                    const clientRate = isBuy
                      ? round(displayMktValue + calc.clientBrokerage)
                      : round(displayMktValue - calc.clientBrokerage);

                    const brokerRate = isBuy
                      ? round(displayMktValue + calc.brokerBrokerage)
                      : round(displayMktValue - calc.brokerBrokerage);

                    return (
                      <tr
                        key={row.uniqueTradeId || row.tradeNumber}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`group hover:bg-slate-50 transition-colors cursor-pointer ${
                          row.status === 'Invalid' ? 'bg-red-50/20' : ''
                        }`}
                      >
                        {/* Checkbox column */}
                        <td
                          className="py-3 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CustomCheckbox
                            checked={row.selected === true}
                            onChange={() => handleToggleRow(row.uniqueTradeId || row.tradeNumber)}
                          />
                        </td>

                        {/* Trade No */}
                        <td className="py-3 px-3 font-mono text-slate-600 font-semibold">{row.tradeNumber || '—'}</td>

                        {/* Date */}
                        <td className="py-3 px-3 font-mono text-slate-700">{row.tradeDate || '—'}</td>

                        {/* Script */}
                        <td className="py-3 px-3">
                          {row.resolvedScriptId ? (
                            <div className="font-bold text-slate-800 font-mono">{row.scriptShortName}</div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDoubleClickScript(
                                  row.scriptShortName,
                                  row.scriptFullName || row.scriptShortName,
                                  row.exchange
                                );
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200"
                            >
                              <span>{row.scriptShortName || 'Missing'}</span>
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </td>

                        {/* Side */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                              isBuy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.buySell}
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {Number(row.quantity).toLocaleString()}
                        </td>

                        {/* Rate */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(row.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Mkt Value - Highlighted */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-l border-r border-slate-200/80">
                          ₹{displayMktValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Client Rate - Highlighted */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
                          ₹{clientRate.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>

                        {/* Broker Rate - Highlighted */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
                          ₹{brokerRate.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>

                        {/* Client Brokerage - Highlighted */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
                          {calc.clientBrokerage > 0 ? `₹${calc.clientBrokerage.toFixed(2)}` : '₹0.00'}
                        </td>

                        {/* Broker Brokerage - Highlighted */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
                          {calc.brokerBrokerage > 0 ? `₹${calc.brokerBrokerage.toFixed(2)}` : '₹0.00'}
                        </td>

                        {/* Client */}
                        <td className="py-3 px-3">
                          {row.resolvedAccountId ? (
                            <span className="font-bold text-slate-800 font-mono">{row.clientCode}</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDoubleClickClient(row.clientCode);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200"
                            >
                              <span>{row.clientCode || 'Missing'}</span>
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </td>

                        {/* Terminal */}
                        <td className="py-3 px-3 font-mono text-slate-600">{row.terminal || '—'}</td>

                        {/* Expiry */}
                        <td className="py-3 px-3 text-slate-600">{row.expiry || '—'}</td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {row.status === 'Valid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : row.status === 'Validating' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Validating</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700"
                              title={row.errors?.join(', ')}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              <span>Invalid</span>
                            </span>
                          )}
                        </td>

                        {/* Edit Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRowIndex(idx);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                            title="Inspect / Edit Row"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 p-4 bg-slate-50 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Rows per page:</span>
              <CustomSelect<number>
                value={pageSize}
                options={[20, 50, 100, 200, 500]}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                size="xs"
                menuWidth={80}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-semibold">
                Showing {filteredFutureRows.length > 0 ? (safePage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(safePage * pageSize, filteredFutureRows.length)} of {filteredFutureRows.length}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={safePage === 1 || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="btn btn--secondary py-1 px-3 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={safePage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="btn btn--secondary py-1 px-3 text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row Inspector Drawer */}
      {selectedRowIndex !== null && selectedRowObj && (
        <TradeRowDrawer
          isOpen={selectedRowIndex !== null}
          onClose={() => setSelectedRowIndex(null)}
          isDubai={false}
          row={selectedRowObj}
          rowIndex={selectedRowIndex}
          onSaveNormalCell={handleCellChange}
          clients={clients}
          exchanges={exchanges}
          scripts={scripts}
          onDoubleClickClient={onDoubleClickClient}
          onDoubleClickScript={onDoubleClickScript}
        />
      )}
    </div>
  );
}
