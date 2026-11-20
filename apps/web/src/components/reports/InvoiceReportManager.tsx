'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  FileText, Search, User, Briefcase, ExternalLink, 
  RotateCcw, ArrowUpDown, ChevronDown, CheckCircle2,
  Calendar, Layers, Download
} from 'lucide-react';
import { useTopBar } from '@/context/TopBarContext';
import { UniversalDropdown, type DropdownOption } from '@/components/ui/UniversalDropdown';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { formatCurrencySymbol } from '@/utils/currency';
import { cn } from '@/utils/cn';
import type { 
  InvoiceReportResponse, 
  InvoiceEntityGroup, 
  InvoiceScriptGroup, 
  InvoiceTradeLeg 
} from './types';

export function InvoiceReportManager() {
  const { setTopBar, resetTopBar } = useTopBar();

  // Filters & State (with smart pre-selected defaults)
  const [entityType, setEntityType] = useState<'CLIENT' | 'BROKER'>('CLIENT');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('ALL');
  const [selectedSettlementId, setSelectedSettlementId] = useState<string>('LATEST');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Data states
  const [invoiceData, setInvoiceData] = useState<InvoiceReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Options
  const [settlementOptions, setSettlementOptions] = useState<DropdownOption[]>([]);
  const [entityOptions, setEntityOptions] = useState<DropdownOption[]>([
    { value: 'ALL', label: 'All Clients' },
  ]);

  // Load settlements list
  useEffect(() => {
    async function loadSettlements() {
      try {
        const res = await apiFetch('/settlement/settlements');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const opts: DropdownOption[] = [
              { value: 'LATEST', label: `Latest (${list[0].name})` },
              ...list.map((s: any) => ({
                value: s.id,
                label: `${s.name} (${formatDateToDDMMYY(s.fromDate)} - ${formatDateToDDMMYY(s.toDate)})`,
              })),
            ];
            setSettlementOptions(opts);
          } else {
            setSettlementOptions([
              { value: 'LATEST', label: 'Live / Unsettled Trades' },
            ]);
          }
        }
      } catch (err) {
        console.warn('Failed to load settlements:', err);
      }
    }
    loadSettlements();
  }, []);

  // Load counterparty accounts (Clients / Brokers)
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await apiFetch('/account-masters');
        if (res.ok) {
          const accs = await res.json();
          if (Array.isArray(accs)) {
            if (entityType === 'CLIENT') {
              const clients: DropdownOption[] = [
                { value: 'ALL', label: 'All Clients' },
                ...accs
                  .filter((a: any) => !a.group?.name?.toUpperCase()?.includes('BROKER'))
                  .map((a: any) => ({
                    value: a.id,
                    label: `${a.code} - ${a.name}`,
                  })),
              ];
              setEntityOptions(clients);
            } else {
              const brokers: DropdownOption[] = [
                { value: 'ALL', label: 'All Brokers' },
                ...accs
                  .filter((a: any) => a.group?.name?.toUpperCase()?.includes('BROKER'))
                  .map((a: any) => ({
                    value: a.id,
                    label: `${a.code} - ${a.name}`,
                  })),
              ];
              setEntityOptions(brokers);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load counterparty accounts:', err);
      }
    }
    loadAccounts();
  }, [entityType]);

  // Fetch invoice report data with pre-thought defaults
  const fetchInvoiceReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('entityType', entityType);
      if (selectedEntityId && selectedEntityId !== 'ALL') {
        params.set('entityId', selectedEntityId);
      }
      if (selectedSettlementId && selectedSettlementId !== 'LATEST') {
        params.set('settlementId', selectedSettlementId);
      }

      const res = await apiFetch(`/reports/invoice?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data: InvoiceReportResponse = await res.json();
      setInvoiceData(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load invoice report', {
        description: err.message || 'Error communicating with server.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [entityType, selectedEntityId, selectedSettlementId]);

  // Zero-click automatic initial loading
  useEffect(() => {
    fetchInvoiceReport();
  }, [fetchInvoiceReport]);

  // Handle "Generate Report" action (Phase 1 preview / Phase 2 redirection)
  const handleGenerateReport = () => {
    toast.success('Report Ready for Generation', {
      description: `Invoice report prepared for ${entityType === 'CLIENT' ? 'Clients' : 'Brokers'}. Dedicated viewer will open in Phase 2.`,
    });
  };

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title: 'Invoice Report (Futures Bill)',
      actions: (
        <div className="flex items-center gap-2">
          <UniversalTooltip content="Generate pure printable report document">
            <button
              type="button"
              onClick={handleGenerateReport}
              className="h-9 px-4 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Report</span>
            </button>
          </UniversalTooltip>
        </div>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar, handleGenerateReport]);

  // Filter invoices by search term
  const filteredInvoices = useMemo(() => {
    if (!invoiceData?.invoices) return [];
    if (!searchTerm.trim()) return invoiceData.invoices;

    const q = searchTerm.toLowerCase().trim();
    return invoiceData.invoices
      .map((inv) => {
        const matchesEntity =
          inv.entityCode.toLowerCase().includes(q) ||
          inv.entityName.toLowerCase().includes(q);

        const matchingScripts = inv.scripts.filter(
          (s) =>
            s.securityName.toLowerCase().includes(q) ||
            s.exchangeCode.toLowerCase().includes(q) ||
            s.trades.some((t) => t.scripName.toLowerCase().includes(q))
        );

        if (matchesEntity) return inv;
        if (matchingScripts.length > 0) {
          return {
            ...inv,
            scripts: matchingScripts,
          };
        }
        return null;
      })
      .filter(Boolean) as InvoiceEntityGroup[];
  }, [invoiceData, searchTerm]);

  // Formatting helpers
  const formatNum = (val: number | null | undefined, decimals = 2) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Control & Filter Toolbar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Entity Type Toggle & Entity Dropdown */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setEntityType('CLIENT');
                  setSelectedEntityId('ALL');
                }}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                  entityType === 'CLIENT'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span>Client Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntityType('BROKER');
                  setSelectedEntityId('ALL');
                }}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                  entityType === 'BROKER'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Broker Invoice</span>
              </button>
            </div>

            {/* Entity Selection Dropdown */}
            <div className="w-60">
              <UniversalDropdown
                value={selectedEntityId}
                options={entityOptions}
                onChange={(val) => setSelectedEntityId(val)}
                placeholder={entityType === 'CLIENT' ? 'Select Client' : 'Select Broker'}
              />
            </div>

            {/* Settlement Cycle Selector */}
            <div className="w-64">
              <UniversalDropdown
                value={selectedSettlementId}
                options={settlementOptions}
                onChange={(val) => setSelectedSettlementId(val)}
                placeholder="Settlement Cycle"
              />
            </div>
          </div>

          {/* Right: Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scrip, code, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#2652C8] focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ── Main Invoices View ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 animate-pulse">
            <Layers className="w-4 h-4 animate-spin text-[#2652C8]" />
            Loading invoice data with pre-selected filters…
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">No Settled Trades Found</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No closed or settled trades matched the selected filters for this settlement period. Invoices exclusively reflect fully settled positions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.entityId}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
            >
              {/* Invoice Header (Client info & settlement period) */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8] font-bold text-xs font-mono shadow-2xs">
                    {invoice.entityCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 uppercase">Code : {invoice.entityCode}</span>
                      <span className="text-slate-300">|</span>
                      <h3 className="text-sm font-bold text-slate-900">{invoice.entityName}</h3>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-[#2652C8]" />
                  <span>Futures Bill From : {invoice.settlementFromDate} to {invoice.settlementToDate}</span>
                </div>
              </div>

              {/* Data Table: Script-by-Script Breakdown */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider select-none">
                      <th className="py-2.5 px-4 text-left">Exchange</th>
                      <th className="py-2.5 px-4 text-left">Exp. Date</th>
                      <th className="py-2.5 px-4 text-left">Scrip</th>
                      <th className="py-2.5 px-4 text-center w-12">Flag</th>
                      <th className="py-2.5 px-4 text-left">Date</th>
                      <th className="py-2.5 px-4 text-right font-mono text-emerald-700">Quantity Buy</th>
                      <th className="py-2.5 px-4 text-right font-mono text-rose-700">Quantity Sell</th>
                      <th className="py-2.5 px-4 text-right font-mono">Net Rate</th>
                      <th className="py-2.5 px-4 text-right font-mono">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.scripts.map((scriptGroup) => (
                      <React.Fragment key={scriptGroup.securityName}>
                        {/* Trade Legs for this Script */}
                        {scriptGroup.trades.map((trade, idx) => (
                          <tr key={trade.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-4 font-mono font-medium text-slate-600">
                              {trade.exchangeCode}
                            </td>
                            <td className="py-2 px-4 font-mono text-slate-600">
                              {trade.expiryFormatted}
                            </td>
                            <td className="py-2 px-4 font-bold text-slate-900 font-mono">
                              {trade.scripName}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {trade.tradeTypeFlag === 'B' ? (
                                <span className="inline-block px-1.5 py-0.2 bg-blue-100 text-blue-700 font-mono font-bold text-[10px] rounded border border-blue-200" title="Back Forwarded Trade">
                                  B
                                </span>
                              ) : trade.tradeTypeFlag === 'C' ? (
                                <span className="inline-block px-1.5 py-0.2 bg-amber-100 text-amber-700 font-mono font-bold text-[10px] rounded border border-amber-200" title="Carry Forwarded Trade">
                                  C
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>
                            <td className="py-2 px-4 font-mono text-slate-600">
                              {trade.tradeDateFormatted}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-700">
                              {trade.buyQty !== null ? formatNum(trade.buyQty, 0) : '—'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-rose-700">
                              {trade.sellQty !== null ? formatNum(trade.sellQty, 0) : '—'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-slate-800">
                              {formatNum(trade.netRate, 4)}
                            </td>
                            <td className={cn(
                              "py-2 px-4 text-right font-mono font-bold",
                              trade.amount < 0 ? "text-rose-600" : "text-emerald-700"
                            )}>
                              {formatNum(trade.amount, 4)}
                            </td>
                          </tr>
                        ))}

                        {/* Script Summary Subtotal Row */}
                        <tr className="bg-slate-50/90 font-bold border-t border-b border-slate-200 text-slate-900">
                          <td className="py-2.5 px-4 font-mono text-slate-600">
                            {scriptGroup.exchangeCode}
                          </td>
                          <td className="py-2.5 px-4" colSpan={2}>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-300/80">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Net = zero
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">***</td>
                          <td className="py-2.5 px-4"></td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                            {formatNum(scriptGroup.totalBuyQty, 0)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-800">
                            {formatNum(scriptGroup.totalSellQty, 0)}
                          </td>
                          <td className="py-2.5 px-4"></td>
                          <td className={cn(
                            "py-2.5 px-4 text-right font-mono font-extrabold text-sm border-b-2",
                            scriptGroup.netAmount < 0 
                              ? "text-rose-700 border-rose-300" 
                              : "text-emerald-700 border-emerald-300"
                          )}>
                            {formatNum(scriptGroup.netAmount, 4)}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Footer / Summary Card */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium">
                  Total {invoice.scripts.length} settled script position(s) in this futures bill.
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Quantity</div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      Buy: {formatNum(invoice.totalBuyQty, 0)} | Sell: {formatNum(invoice.totalSellQty, 0)}
                    </div>
                  </div>

                  <div className="text-right pl-6 border-l border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {invoice.balanceType === 'Dr' ? 'Net Receivable (Dr.)' : 'Net Payable (Cr.)'}
                    </div>
                    <div className={cn(
                      "text-base font-mono font-extrabold mt-0.5",
                      invoice.balanceType === 'Dr' ? "text-emerald-700" : "text-rose-700"
                    )}>
                      {formatNum(invoice.netPayableOrReceivable, 4)} {invoice.balanceType}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
