'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, Edit3, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { generateDubaiSecurityName } from './tradeImportHelpers';
import { TradeRowDrawer } from './TradeRowDrawer';
import type { DubaiParsedTrade } from '../../lib/tradeParser';

interface DubaiPreviewTableProps {
  dubaiPreviewRows: DubaiParsedTrade[];
  setDubaiPreviewRows: React.Dispatch<React.SetStateAction<DubaiParsedTrade[]>>;
  clients: any[];
  exchanges: any[];
  scripts: any[];
  getDubaiRowValidation: (row: DubaiParsedTrade) => {
    isValid: boolean;
    errors: string[];
    resolvedClientId?: string;
    resolvedScriptId?: string;
    resolvedExchangeId?: string;
    resolvedCurrencyId?: string;
    dealerCode?: string;
  };
  searchQuery: string;
  searchColumn: string;
  exactMatch: boolean;
  showValidOnly: boolean;
  statusFilter: string;
  dubaiCurrentPage: number;
  setDubaiCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  dubaiPageSize: number;
  setDubaiPageSize: React.Dispatch<React.SetStateAction<number>>;
  dubaiDebugSample?: string;
  isValidatingMasterData?: boolean;
  onDoubleClickClient: (code: string) => void;
  onDoubleClickScript: (shortName: string, fullName: string, exchangeCode: string, marketLot?: any, currencyCode?: string) => void;
  onDoubleClickExchange: (code: string) => void;
  onDoubleClickCurrency: (code: string) => void;
}

export function DubaiPreviewTable({
  dubaiPreviewRows,
  setDubaiPreviewRows,
  clients,
  exchanges,
  scripts,
  getDubaiRowValidation,
  searchQuery,
  searchColumn,
  exactMatch,
  showValidOnly,
  statusFilter,
  dubaiCurrentPage,
  setDubaiCurrentPage,
  dubaiPageSize,
  setDubaiPageSize,
  dubaiDebugSample,
  isValidatingMasterData = false,
  onDoubleClickClient,
  onDoubleClickScript,
  onDoubleClickExchange,
  onDoubleClickCurrency,
}: DubaiPreviewTableProps) {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const activeDubaiRows = dubaiPreviewRows.filter((r) => !r.typeCode.toUpperCase().includes('X'));
  const excludedDubaiRows = dubaiPreviewRows.filter((r) => r.typeCode.toUpperCase().includes('X'));

  const filteredDubaiRows = activeDubaiRows.filter((row) => {
    const val = getDubaiRowValidation(row);

    if (showValidOnly && !val.isValid) return false;
    if (statusFilter === 'VALID' && !val.isValid) return false;
    if (statusFilter === 'INVALID' && val.isValid) return false;
    if (statusFilter === 'UNMAPPED_CLIENT' && val.resolvedClientId) return false;
    if (statusFilter === 'UNMAPPED_SCRIPT' && val.resolvedScriptId) return false;
    if (statusFilter === 'UNMAPPED_EXCHANGE' && val.resolvedExchangeId) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    const scriptObj = scripts.find((s) => s.shortName.toUpperCase() === (row.tickCode || '').toUpperCase());
    const secName = generateDubaiSecurityName(row, scriptObj) || row.securityName || '';

    const matches = (fieldVal: string | number | null | undefined) => {
      if (fieldVal === null || fieldVal === undefined) return false;
      const target = String(fieldVal).toLowerCase();
      return exactMatch ? target === q : target.includes(q);
    };

    if (searchColumn === 'clientCode') return matches(row.clientCode);
    if (searchColumn === 'dealerCode') return matches(val.dealerCode);
    if (searchColumn === 'tickCode') return matches(row.tickCode);
    if (searchColumn === 'securityName') return matches(secName);
    if (searchColumn === 'marketCode') return matches(row.marketCode);
    if (searchColumn === 'orderId') return matches(row.exchOrderId);
    if (searchColumn === 'tradeDate') return matches(row.tradeDate);
    if (searchColumn === 'quantity') return matches(row.qty);
    if (searchColumn === 'price') return matches(row.price);

    return (
      matches(row.clientCode) ||
      matches(val.dealerCode) ||
      matches(row.tickCode) ||
      matches(secName) ||
      matches(row.marketCode) ||
      matches(row.exchOrderId) ||
      matches(row.tradeDate) ||
      matches(row.qty) ||
      matches(row.price)
    );
  });

  const totalDubaiPages = Math.max(1, Math.ceil(filteredDubaiRows.length / dubaiPageSize));
  const safeDubaiPage = Math.min(dubaiCurrentPage, totalDubaiPages);
  const paginatedDubaiRows = filteredDubaiRows.slice(
    (safeDubaiPage - 1) * dubaiPageSize,
    safeDubaiPage * dubaiPageSize
  );

  const handleCellChange = (index: number, field: keyof DubaiParsedTrade, value: string) => {
    setDubaiPreviewRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const selectedRowObj = selectedRowIndex !== null ? dubaiPreviewRows[selectedRowIndex] : null;
  const selectedRowValidation = selectedRowObj ? getDubaiRowValidation(selectedRowObj) : undefined;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Parsed Dubai Rows</div>
              <div className="text-lg font-bold text-[var(--color-charcoal)]">{activeDubaiRows.length} active</div>
            </div>
          </div>
        </div>

        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Valid Trades</div>
              <div className="text-lg font-bold text-[var(--color-positive)]">
                {activeDubaiRows.filter((r) => getDubaiRowValidation(r).isValid).length} ready
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-[var(--color-snow)]">
          <div className="card__body p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Excluded X Trades</div>
              <div className="text-lg font-bold text-rose-600">{excludedDubaiRows.length} excluded</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[var(--color-slate)] bg-emerald-50/60 border border-emerald-200 rounded-lg px-4 py-3 gap-2">
        <span className="flex items-center gap-2">
          <span className="font-bold text-emerald-800">💡 Quick Tip:</span> Click any row to inspect & edit all fields in the side drawer. Click unmapped client/script badges to add them immediately.
        </span>
        {dubaiDebugSample && (
          <button
            onClick={() => {
              const blob = new Blob([dubaiDebugSample], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', 'dubai_debug_sample.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-xs font-bold text-blue-600 hover:underline shrink-0 flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Download Debug Sample CSV
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table whitespace-nowrap" style={{ tableLayout: 'auto', minWidth: '2200px' }}>
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider select-none text-[11px]">
                <th className="py-3 px-3 text-center">Sr. No.</th>
                <th className="py-3 px-3">Trade Date</th>
                <th className="py-3 px-3">Trade Time</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Dealer Code</th>
                <th className="py-3 px-3">Exchange</th>
                <th className="py-3 px-3">Curr</th>
                <th className="py-3 px-3 min-w-[220px]">Security Name</th>
                <th className="py-3 px-3">Del Month</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3 text-right">Market Lot</th>
                <th className="py-3 px-3">Call/Put</th>
                <th className="py-3 px-3 text-right">Strike Price</th>
                <th className="py-3 px-3">Tick Code</th>
                <th className="py-3 px-3">Bloomberg</th>
                <th className="py-3 px-3 text-center">Side</th>
                <th className="py-3 px-3 text-right font-bold">Qty</th>
                <th className="py-3 px-3 text-right font-bold">Price</th>
                <th className="py-3 px-3 text-right font-bold">Mkt Value</th>
                <th className="py-3 px-3 text-right">Commission</th>
                <th className="py-3 px-3 text-right">Ex Charges</th>
                <th className="py-3 px-3 text-right">Charges 1</th>
                <th className="py-3 px-3 text-right">Charges 2</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedDubaiRows.length === 0 ? (
                <tr>
                  <td colSpan={24} className="py-8 text-center text-slate-400 italic">
                    No matching Dubai trade rows found.
                  </td>
                </tr>
              ) : (
                paginatedDubaiRows.map((row, relativeIdx) => {
                  const mainIdx = dubaiPreviewRows.findIndex((r) => r === row);
                  const val = getDubaiRowValidation(row);

                  const scriptObj = scripts.find(
                    (s) => s.shortName.toUpperCase() === (row.tickCode || '').toUpperCase()
                  );
                  const generatedSecurityName = generateDubaiSecurityName(row, scriptObj);

                  const isMappedScript = Boolean(val.resolvedScriptId);
                  const displaySecName = generatedSecurityName || row.securityName || row.tickCode || '—';

                  const isBuy = (row.buySellFlag || '').toUpperCase().startsWith('B') || row.buySellFlag === '1';

                  // Strip time from Trade Date & Expiry Date
                  const cleanTradeDate = row.tradeDate ? row.tradeDate.split(' ')[0] : '—';
                  const cleanExpiryDate = row.expiryDate ? row.expiryDate.split(' ')[0] : '—';

                  return (
                    <tr
                      key={mainIdx}
                      onClick={() => setSelectedRowIndex(mainIdx)}
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${
                        !val.isValid && !isValidatingMasterData ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* 1. # */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {(dubaiCurrentPage - 1) * dubaiPageSize + relativeIdx + 1}
                      </td>

                      {/* 2. Trade Date */}
                      <td className="py-3 px-3 font-mono text-slate-700">{cleanTradeDate}</td>

                      {/* 3. Trade Time */}
                      <td className="py-3 px-3 font-mono text-slate-600">{row.tradeTime || '—'}</td>

                      {/* 4. Client */}
                      <td className="py-3 px-3">
                        {val.resolvedClientId || isValidatingMasterData ? (
                          <span className="font-bold text-slate-800 font-mono">{row.clientCode}</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDoubleClickClient(row.clientCode);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                            title="Unmapped client. Click to create."
                          >
                            <span>{row.clientCode || 'Missing'}</span>
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      {/* 5. Dealer Code */}
                      <td className="py-3 px-3 font-mono text-slate-600">{val.dealerCode || '-'}</td>

                      {/* Exchange */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{row.marketCode || '—'}</td>

                      {/* 6. Curr */}
                      <td className="py-3 px-3">
                        {val.resolvedCurrencyId || isValidatingMasterData ? (
                          <span className="font-mono text-slate-700 font-bold">{row.currencyCode || 'USD'}</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDoubleClickCurrency(row.currencyCode || 'USD');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                            title="Unmapped currency. Click to add."
                          >
                            <span>{row.currencyCode || 'USD'}</span>
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      {/* 7. Security Name */}
                      <td className="py-3 px-3">
                        {isMappedScript || isValidatingMasterData ? (
                          <div className="font-semibold text-slate-800" title={displaySecName}>
                            {displaySecName}
                          </div>
                        ) : (
                          <div className="font-serif italic font-semibold text-rose-600 flex items-center gap-1.5" title="Unmapped script raw name">
                            <span>{displaySecName}</span>
                            <span className="not-italic text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-700 font-sans rounded font-bold">Unmapped</span>
                          </div>
                        )}
                      </td>

                      {/* 8. Del Month */}
                      <td className="py-3 px-3 font-mono text-slate-600">{row.delMonth || '—'}</td>

                      {/* 9. Expiry Date */}
                      <td className="py-3 px-3 font-mono text-slate-600">{cleanExpiryDate}</td>

                      {/* 10. Market Lot */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.marketLot ? Number(row.marketLot).toLocaleString() : '—'}
                      </td>

                      {/* 11. Call/Put */}
                      <td className="py-3 px-3 font-semibold text-slate-700">{row.callPut || 'Future'}</td>

                      {/* 12. Strike Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.strikePrice ? Number(row.strikePrice).toLocaleString() : '—'}
                      </td>

                      {/* 13. Tick Code */}
                      <td className="py-3 px-3 font-mono">
                        {val.resolvedScriptId || isValidatingMasterData ? (
                          <span className="font-bold text-slate-800">{row.tickCode}</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDoubleClickScript(row.tickCode, row.securityName || row.tickCode, row.marketCode, row.marketLot, row.currencyCode);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200"
                          >
                            <span>{row.tickCode}</span>
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      {/* 14. Bloomberg */}
                      <td className="py-3 px-3 font-mono text-slate-600">{row.bloombergCode || '—'}</td>

                      {/* 15. Side */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                            isBuy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </td>

                      {/* 16. Qty */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {Number(row.qty).toLocaleString()}
                      </td>

                      {/* 17. Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {Number(row.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 18. Mkt Value */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 font-bold">
                        {row.mktValue ? Number(row.mktValue).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </td>

                      {/* 19. Commission */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.clnCommission ? Number(row.clnCommission).toFixed(2) : '—'}
                      </td>

                      {/* 20. Ex Charges */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.clnExCharges ? Number(row.clnExCharges).toFixed(2) : '—'}
                      </td>

                      {/* 21. Charges 1 */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.clnCharges1 ? Number(row.clnCharges1).toFixed(2) : '—'}
                      </td>

                      {/* 22. Charges 2 */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.clnCharges2 ? Number(row.clnCharges2).toFixed(2) : '—'}
                      </td>

                      {/* 23. Status */}
                      <td className="py-3 px-3 text-center">
                        {isValidatingMasterData ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                            <span>Checking...</span>
                          </span>
                        ) : val.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700"
                            title={val.errors.join(', ')}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Error ({val.errors.length})</span>
                          </span>
                        )}
                      </td>

                      {/* 25. Edit Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRowIndex(mainIdx);
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
            <select
              value={dubaiPageSize}
              onChange={(e) => {
                setDubaiPageSize(Number(e.target.value));
                setDubaiCurrentPage(1);
              }}
              className="input py-1 px-2 text-xs w-[80px]"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-semibold">
              Showing {filteredDubaiRows.length > 0 ? (safeDubaiPage - 1) * dubaiPageSize + 1 : 0} -{' '}
              {Math.min(safeDubaiPage * dubaiPageSize, filteredDubaiRows.length)} of {filteredDubaiRows.length}
            </span>
            <div className="flex gap-1">
              <button
                disabled={safeDubaiPage === 1 || totalDubaiPages === 0}
                onClick={() => setDubaiCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="btn btn--secondary py-1 px-3 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={safeDubaiPage === totalDubaiPages || totalDubaiPages === 0}
                onClick={() => setDubaiCurrentPage((prev) => Math.min(prev + 1, totalDubaiPages))}
                className="btn btn--secondary py-1 px-3 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row Drawer Modal */}
      {selectedRowIndex !== null && selectedRowObj && (
        <TradeRowDrawer
          isOpen={selectedRowIndex !== null}
          onClose={() => setSelectedRowIndex(null)}
          isDubai={true}
          row={selectedRowObj}
          rowIndex={selectedRowIndex}
          onSaveDubaiCell={handleCellChange}
          clients={clients}
          exchanges={exchanges}
          scripts={scripts}
          validation={selectedRowValidation}
          onDoubleClickClient={onDoubleClickClient}
          onDoubleClickScript={onDoubleClickScript}
          onDoubleClickExchange={onDoubleClickExchange}
        />
      )}
    </div>
  );
}
