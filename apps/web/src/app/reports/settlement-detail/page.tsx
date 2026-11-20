'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { ReportControlsBar } from '@/components/reports/ReportControlsBar';
import { SettlementAuditTable } from '@/components/reports/SettlementAuditTable';
import {
  generateCsvString,
  downloadCsvFile,
  formatExportFilename,
  triggerPrint,
} from '@/components/reports/ReportExportUtils';
import { SettlementDetailAuditResponse, TradeClassification } from '@/components/reports/types';
import { DropdownOption } from '@/components/ui/UniversalDropdown';

export default function SettlementDetailPage() {
  const [settlementId, setSettlementId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [tradeType, setTradeType] = useState<string>('ALL');
  const [clientId, setClientId] = useState<string>('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [auditData, setAuditData] = useState<SettlementDetailAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dropdown reference options
  const [settlementOptions, setSettlementOptions] = useState<DropdownOption[]>([]);
  const [clientOptions, setClientOptions] = useState<DropdownOption[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<DropdownOption[]>([]);

  // Load settlements and account master options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [settleRes, accRes] = await Promise.all([
          apiFetch('/settlement/settlements'),
          apiFetch('/account-masters'),
        ]);

        if (settleRes.ok) {
          const settlements = await settleRes.json();
          if (Array.isArray(settlements)) {
            const opts: DropdownOption[] = [
              { value: 'LIVE', label: 'Live Unsettled Trades' },
              ...settlements.map((s: any) => ({
                value: s.id,
                label: `${s.name} (${formatDateToDDMMYY(s.fromDate)} to ${formatDateToDDMMYY(s.toDate)})`,
              })),
            ];
            setSettlementOptions(opts);
            if (settlements.length > 0 && !settlementId) {
              setSettlementId(settlements[0].id);
            }
          }
        }

        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs)) {
            const clients = accs.map((a: any) => ({
              value: a.id,
              label: `${a.code} - ${a.name}`,
            }));
            setClientOptions(clients);

            const brokers = accs
              .filter((a: any) => a.group?.name?.toUpperCase()?.includes('BROKER'))
              .map((a: any) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }));
            setBrokerOptions(brokers.length > 0 ? brokers : clients);
          }
        }
      } catch (err) {
        console.warn('Failed to load settlement options:', err);
      }
    }
    loadOptions();
  }, [settlementId]);

  // Fetch audit report data
  const fetchAuditReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (settlementId) params.set('settlementId', settlementId);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (tradeType && tradeType !== 'ALL') params.set('tradeType', tradeType);
      if (clientId) params.set('clientId', clientId);
      if (brokerId) params.set('brokerId', brokerId);

      const res = await apiFetch(`/reports/settlement-detail?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data: SettlementDetailAuditResponse = await res.json();
      setAuditData(data);
    } catch (err) {
      toast.error('Failed to load Settlement Audit Report', {
        description: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [settlementId, fromDate, toDate, tradeType, clientId, brokerId]);

  useEffect(() => {
    fetchAuditReport();
  }, [fetchAuditReport]);

  // Client-side search filtering
  const filteredClientGroups = useMemo(() => {
    if (!auditData?.clientAuditGroups) return [];
    if (!searchTerm.trim()) return auditData.clientAuditGroups;

    const term = searchTerm.toLowerCase();
    return auditData.clientAuditGroups
      .map((g) => {
        const matchesGroup =
          g.clientCode.toLowerCase().includes(term) || g.clientName.toLowerCase().includes(term);

        if (matchesGroup) return g;

        const matchingTrades = g.trades.filter(
          (t) =>
            t.tradeNumber.toLowerCase().includes(term) ||
            t.securityName.toLowerCase().includes(term) ||
            (t.brokerCode && t.brokerCode.toLowerCase().includes(term))
        );

        if (matchingTrades.length > 0) {
          return {
            ...g,
            trades: matchingTrades,
          };
        }
        return null;
      })
      .filter((g): g is typeof auditData.clientAuditGroups[0] => g !== null);
  }, [auditData, searchTerm]);

  // CSV Export
  const handleExportCsv = () => {
    if (!auditData || !auditData.clientAuditGroups) {
      toast.error('No data available to export');
      return;
    }

    const headers = [
      'Client Code',
      'Client Name',
      'Trade Date (DD-MM-YY)',
      'Trade No',
      'Classification',
      'Security',
      'Broker Code',
      'Side',
      'Lots',
      'Market Lot',
      'Total Units',
      'Rate',
      'Trade Value',
      'PnL Impact',
    ];

    const rows: (string | number)[][] = [];

    for (const g of auditData.clientAuditGroups) {
      for (const t of g.trades) {
        rows.push([
          g.clientCode,
          g.clientName,
          t.tradeDate,
          t.tradeNumber,
          t.tradeType,
          t.securityName,
          t.brokerCode || '',
          t.transactionType,
          t.quantity,
          t.marketLot,
          t.totalUnits,
          t.rate.toFixed(4),
          t.tradeValue.toFixed(2),
          t.pnl.toFixed(2),
        ]);
      }
    }

    const csv = generateCsvString(headers, rows);
    const cycleName = auditData.settlementInfo.name || 'Cycle';
    const filename = formatExportFilename('Settlement_Audit_Report', cycleName);
    downloadCsvFile(filename, csv);
    toast.success('Settlement Audit Report exported to CSV');
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setTradeType('ALL');
    setClientId('');
    setBrokerId('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <ReportHeader
        title="Settlement Report"
        subtitle="Complete trade provenance categorized into Regular, Carry Forward, Back Forward, and Settlement entries"
        periodLabel="Settlement Period"
        asOfDate={
          auditData?.settlementInfo
            ? `${auditData.settlementInfo.fromDate} to ${auditData.settlementInfo.toDate}`
            : undefined
        }
        isLoading={isLoading}
        onRefresh={fetchAuditReport}
        onExportCsv={handleExportCsv}
        onPrint={triggerPrint}
        onGenerateReport={() => {
          toast.success('Report Ready for Generation', {
            description: 'Settlement report prepared. Dedicated viewer will open in Phase 2.',
          });
        }}
      />

      {/* ─── CONTROLS BAR ──────────────────────────────────────────────────── */}
      <ReportControlsBar
        settlementId={settlementId}
        onSettlementChange={setSettlementId}
        settlementOptions={settlementOptions}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        tradeType={tradeType}
        onTradeTypeChange={setTradeType}
        clientId={clientId}
        onClientChange={setClientId}
        clientOptions={clientOptions}
        brokerId={brokerId}
        onBrokerChange={setBrokerId}
        brokerOptions={brokerOptions}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter trades or accounts..."
        onResetFilters={handleResetFilters}
      />

      {/* ─── METRIC OVERVIEW CARDS ─────────────────────────────────────────── */}
      {auditData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Trades
            </span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {auditData.metrics.totalTrades.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              Regular Trades
            </span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {auditData.metrics.regularCount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Carry Forward (CF)
            </span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {auditData.metrics.cfCount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Back Forward (BF)
            </span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {auditData.metrics.bfCount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Settlement Trades
            </span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {auditData.metrics.settlementCount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Cycle PnL
            </span>
            <p
              className={`text-xl font-bold font-mono mt-1 ${
                auditData.metrics.totalCyclePnL > 0
                  ? 'text-emerald-700'
                  : auditData.metrics.totalCyclePnL < 0
                  ? 'text-rose-700'
                  : 'text-slate-900'
              }`}
            >
              {auditData.metrics.totalCyclePnL > 0 ? '+' : ''}₹
              {auditData.metrics.totalCyclePnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* ─── CATEGORIZED AUDIT TABLE ───────────────────────────────────────── */}
      <SettlementAuditTable clientGroups={filteredClientGroups} />
    </div>
  );
}
