'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, ExternalLink, Replace, CheckSquare } from 'lucide-react';
import { generateDubaiSecurityName } from './tradeImportHelpers';
import { TradeRowDrawer } from './TradeRowDrawer';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { CustomSelect } from '../ui/CustomSelect';
import { FindAndReplace, type FindAndReplaceColumn } from '../ui/FindAndReplace';
import type { DubaiParsedTrade } from '../../lib/tradeParser';
import { splitSearchTokens } from '@/utils/tableFilter';
import { DubaiTableRow } from './DubaiTableRow';

interface DubaiPreviewTableProps {
  dubaiPreviewRows: DubaiParsedTrade[];
  setDubaiPreviewRows: React.Dispatch<React.SetStateAction<DubaiParsedTrade[]>>;
  clients: any[];
  exchanges: any[];
  scripts: any[];
  brokerages?: any[];
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
  brokerages,
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
    const tokens = splitSearchTokens(searchQuery);
    if (tokens.length === 0) return true;

    const scriptObj = scripts.find((s) => s.shortName.toUpperCase() === (row.tickCode || '').toUpperCase());
    const secName = generateDubaiSecurityName(row, scriptObj) || row.securityName || '';

    const matches = (fieldVal: string | number | null | undefined) => {
      if (fieldVal === null || fieldVal === undefined) return false;
      const target = String(fieldVal).toLowerCase();
      if (exactMatch) {
        return tokens.some((token) => target === token);
      }
      return tokens.some((token) => target.includes(token));
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

  const [showFindAndReplace, setShowFindAndReplace] = useState(false);

  // Selection calculations (default: deselected)
  const selectedCount = activeDubaiRows.filter((r) => r.selected === true).length;
  const isAllFilteredSelected =
    filteredDubaiRows.length > 0 && filteredDubaiRows.every((r) => r.selected === true);

  const handleToggleSelectAll = () => {
    const target = !isAllFilteredSelected;
    const filteredSet = new Set(filteredDubaiRows);
    setDubaiPreviewRows((prev) =>
      prev.map((r) => {
        if (filteredSet.has(r)) {
          return { ...r, selected: target };
        }
        return r;
      })
    );
  };

  const handleToggleRow = (mainIdx: number) => {
    setDubaiPreviewRows((prev) => {
      const copy = [...prev];
      const current = copy[mainIdx].selected === true;
      copy[mainIdx] = { ...copy[mainIdx], selected: !current };
      return copy;
    });
  };

  const handleSelectAllValid = () => {
    setDubaiPreviewRows((prev) =>
      prev.map((r) => {
        const val = getDubaiRowValidation(r);
        return { ...r, selected: val.isValid };
      })
    );
  };

  const handleDeselectAll = () => {
    setDubaiPreviewRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const findAndReplaceColumns: FindAndReplaceColumn[] = [
    { key: 'clientCode', label: 'Client Code' },
    { key: 'tickCode', label: 'Tick / Script Code' },
    { key: 'marketCode', label: 'Exchange / Market Code' },
    { key: 'securityName', label: 'Security Name' },
    { key: 'tradeDate', label: 'Trade Date' },
    { key: 'expiryDate', label: 'Expiry Date' },
    { key: 'qty', label: 'Quantity' },
    { key: 'price', label: 'Price' },
    { key: 'exchOrderId', label: 'Exchange Order ID' },
  ];

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    handleCellChange(rowIndex, columnKey as keyof DubaiParsedTrade, newValue);
  };

  const handleReplaceAll = (columnKey: string, findValue: string, replaceValue: string) => {
    if (!findValue) return;
    setDubaiPreviewRows((prev) =>
      prev.map((row) => {
        const current = String((row as any)[columnKey] || '');
        if (current.toLowerCase().includes(findValue.toLowerCase())) {
          const escaped = findValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'gi');
          const updated = current.replace(regex, replaceValue);
          return { ...row, [columnKey]: updated };
        }
        return row;
      })
    );
  };

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

      {/* Batch Selection & Action Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>{selectedCount}</strong> of {activeDubaiRows.length} trades selected for import
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

        <button
          type="button"
          onClick={() => setShowFindAndReplace(!showFindAndReplace)}
          className={`btn btn--secondary text-xs flex items-center gap-1.5 py-1.5 px-3 transition-colors cursor-pointer ${
            showFindAndReplace ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : ''
          }`}
        >
          <Replace className="w-3.5 h-3.5 text-emerald-600" />
          <span>Find & Replace</span>
        </button>
      </div>

      {/* Find & Replace Drawer / Panel */}
      {showFindAndReplace && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <FindAndReplace<DubaiParsedTrade>
            data={dubaiPreviewRows}
            columns={findAndReplaceColumns}
            onReplaceOne={handleReplaceOne}
            onReplaceAll={handleReplaceAll}
            onClose={() => setShowFindAndReplace(false)}
          />
        </div>
      )}

      {/* Main Table Card */}
      <div className="card shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table whitespace-nowrap" style={{ tableLayout: 'auto', minWidth: '2200px' }}>
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider select-none text-[11px]">
                <th className="py-3 px-3 text-center" style={{ width: '40px' }}>
                  <CustomCheckbox
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
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
                <th className="py-3 px-3 text-right font-bold">Mkt Value</th>

                {/* 5 Highlighted Columns: Price, Client Rate, Broker Rate, Client Brk, Broker Brk */}
                <th className="py-3 px-3 text-right font-bold bg-slate-200/90 text-slate-800 border-l border-r border-slate-300">
                  Price
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
                  <td colSpan={30} className="py-8 text-center text-slate-400 italic">
                    No matching Dubai trade rows found.
                  </td>
                </tr>
              ) : (
                paginatedDubaiRows.map((row, relativeIdx) => {
                  const mainIdx = dubaiPreviewRows.findIndex((r) => r === row);
                  const val = getDubaiRowValidation(row);

                  return (
                    <DubaiTableRow
                      key={mainIdx}
                      row={row}
                      mainIdx={mainIdx}
                      relativeIdx={relativeIdx}
                      dubaiCurrentPage={dubaiCurrentPage}
                      dubaiPageSize={dubaiPageSize}
                      val={val}
                      scripts={scripts}
                      brokerages={brokerages}
                      isValidatingMasterData={isValidatingMasterData}
                      onToggleRow={handleToggleRow}
                      onSelectRow={setSelectedRowIndex}
                      onDoubleClickClient={onDoubleClickClient}
                      onDoubleClickScript={onDoubleClickScript}
                      onDoubleClickExchange={onDoubleClickExchange}
                      onDoubleClickCurrency={onDoubleClickCurrency}
                    />
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
              value={dubaiPageSize}
              options={[20, 50, 100, 200, 500]}
              onChange={(val) => {
                setDubaiPageSize(Number(val));
                setDubaiCurrentPage(1);
              }}
              size="xs"
              menuWidth={80}
            />
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
