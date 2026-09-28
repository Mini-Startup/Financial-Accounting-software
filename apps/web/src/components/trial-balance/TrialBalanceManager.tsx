'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Scale,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  RefreshCw,
  Layers,
  Users,
  Building2,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { UniversalDatePicker } from '../ui/UniversalDatePicker';
import { UniversalDropdown } from '../ui/UniversalDropdown';

export interface TrialBalanceAccountRow {
  id: string;
  code: string;
  name: string;
  groupId: number;
  groupName: string;
  category: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER';
  categoryLabel: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr' | 'Nil';
  periodDebit: number;
  periodCredit: number;
  netMovement: number;
  closingDebit: number;
  closingCredit: number;
  netClosingBalance: number;
  closingType: 'Dr' | 'Cr' | 'Nil';
}

export interface TrialBalanceCategorySummary {
  category: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER';
  categoryLabel: string;
  accountCount: number;
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  netBalance: number;
}

export interface TrialBalanceGroupSummary {
  groupId: number;
  groupName: string;
  category: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER';
  accountCount: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  netBalance: number;
}

export interface TrialBalanceReport {
  asOfDate: string | null;
  fromDate: string | null;
  toDate: string | null;
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    grandTotalOpeningDebit: number;
    grandTotalOpeningCredit: number;
    grandTotalPeriodDebit: number;
    grandTotalPeriodCredit: number;
    grandTotalClosingDebit: number;
    grandTotalClosingCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  categories: TrialBalanceCategorySummary[];
  groups: TrialBalanceGroupSummary[];
  rows: TrialBalanceAccountRow[];
}

export function TrialBalanceManager({
  initialReport,
  groups,
}: {
  initialReport: TrialBalanceReport;
  groups: any[];
}) {
  const [report, setReport] = useState<TrialBalanceReport>(initialReport);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchColumn, setSearchColumn] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER'>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [hideZeroBalance, setHideZeroBalance] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'standard' | 'detailed'>('detailed');
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);

  const groupOptions = useMemo(() => [
    { value: '', label: `-- All Groups (${groups?.length || 0}) --` },
    ...(groups?.map((g) => ({
      value: String(g.id),
      label: g.name,
    })) || []),
  ], [groups]);

  // Fetch report
  const fetchReport = useCallback(async (asOfDate?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOfDate) params.set('toDate', asOfDate);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trial-balance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        toast.success('Trial Balance refreshed');
      } else {
        toast.error('Failed to fetch trial balance');
      }
    } catch {
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDateChange = (val: string) => {
    setToDate(val);
    fetchReport(val || undefined);
  };

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!report?.rows) return [];

    return report.rows.filter((r) => {
      // Category filter
      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) {
        return false;
      }

      // Group filter
      if (selectedGroupId && String(r.groupId) !== selectedGroupId) {
        return false;
      }

      // Zero balance filter
      if (hideZeroBalance && r.closingDebit === 0 && r.closingCredit === 0 && r.periodDebit === 0 && r.periodCredit === 0) {
        return false;
      }

      // Search query with column targeting
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (searchColumn === 'code') {
          if (!(r.code || '').toLowerCase().includes(q)) return false;
        } else if (searchColumn === 'name') {
          if (!(r.name || '').toLowerCase().includes(q)) return false;
        } else if (searchColumn === 'groupName') {
          if (!(r.groupName || '').toLowerCase().includes(q)) return false;
        } else {
          const matchesCode = (r.code || '').toLowerCase().includes(q);
          const matchesName = (r.name || '').toLowerCase().includes(q);
          const matchesGroup = (r.groupName || '').toLowerCase().includes(q);
          if (!matchesCode && !matchesName && !matchesGroup) {
            return false;
          }
        }
      }

      return true;
    });
  }, [report, selectedCategory, selectedGroupId, hideZeroBalance, searchQuery, searchColumn]);

  // Dynamic Subtotals for currently filtered view
  const visibleSummary = useMemo(() => {
    let totalOpeningDr = 0;
    let totalOpeningCr = 0;
    let totalPeriodDr = 0;
    let totalPeriodCr = 0;
    let totalClosingDr = 0;
    let totalClosingCr = 0;

    for (const r of filteredRows) {
      const opDr = r.openingBalance < 0 ? Math.abs(r.openingBalance) : 0;
      const opCr = r.openingBalance > 0 ? r.openingBalance : 0;
      totalOpeningDr += opDr;
      totalOpeningCr += opCr;
      totalPeriodDr += r.periodDebit;
      totalPeriodCr += r.periodCredit;
      totalClosingDr += r.closingDebit;
      totalClosingCr += r.closingCredit;
    }

    const diff = Number(Math.abs(totalClosingDr - totalClosingCr).toFixed(2));

    return {
      count: filteredRows.length,
      totalOpeningDr: Number(totalOpeningDr.toFixed(2)),
      totalOpeningCr: Number(totalOpeningCr.toFixed(2)),
      totalPeriodDr: Number(totalPeriodDr.toFixed(2)),
      totalPeriodCr: Number(totalPeriodCr.toFixed(2)),
      totalClosingDr: Number(totalClosingDr.toFixed(2)),
      totalClosingCr: Number(totalClosingCr.toFixed(2)),
      difference: diff,
      isBalanced: diff < 0.01,
    };
  }, [filteredRows]);

  // Grouped rows map (if groupByCategory is true)
  const groupedData = useMemo(() => {
    if (!groupByCategory) return null;

    const map = new Map<'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER', { label: string; rows: TrialBalanceAccountRow[]; totalDr: number; totalCr: number }>();
    map.set('CLIENT', { label: 'Clients (Sundry Debtors)', rows: [], totalDr: 0, totalCr: 0 });
    map.set('BROKER', { label: 'Brokers (Sundry Creditors)', rows: [], totalDr: 0, totalCr: 0 });
    map.set('ACCOUNT_MASTER', { label: 'Account Masters & General Accounts', rows: [], totalDr: 0, totalCr: 0 });

    for (const r of filteredRows) {
      const g = map.get(r.category);
      if (g) {
        g.rows.push(r);
        g.totalDr += r.closingDebit;
        g.totalCr += r.closingCredit;
      }
    }

    return Array.from(map.entries())
      .filter(([, data]) => data.rows.length > 0)
      .map(([cat, data]) => ({
        category: cat,
        label: data.label,
        rows: data.rows,
        totalDr: Number(data.totalDr.toFixed(2)),
        totalCr: Number(data.totalCr.toFixed(2)),
      }));
  }, [filteredRows, groupByCategory]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredRows.length) {
      toast.error('No records to export');
      return;
    }

    const headers = [
      'Account Code',
      'Account Name',
      'Group Name',
      'Category',
      'Opening Balance',
      'Opening Type',
      'Period Debits (Dr)',
      'Period Credits (Cr)',
      'Closing Debit (Dr)',
      'Closing Credit (Cr)',
      'Net Closing Balance',
      'Closing Type',
    ];

    const csvLines = filteredRows.map((r) => [
      `"${r.code}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.groupName}"`,
      `"${r.category}"`,
      r.openingBalance,
      r.openingType,
      r.periodDebit,
      r.periodCredit,
      r.closingDebit,
      r.closingCredit,
      r.netClosingBalance,
      r.closingType,
    ]);

    // Totals line
    csvLines.push([
      '"TOTAL"',
      `"Total of ${filteredRows.length} Accounts"`,
      '""',
      '""',
      '""',
      '""',
      visibleSummary.totalPeriodDr,
      visibleSummary.totalPeriodCr,
      visibleSummary.totalClosingDr,
      visibleSummary.totalClosingCr,
      '""',
      visibleSummary.isBalanced ? '"BALANCED"' : `"${visibleSummary.difference} DIFF"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvLines.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Trial_Balance_${toDate || new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Trial Balance CSV exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = report?.summary || {
    totalAccounts: 0,
    activeAccounts: 0,
    grandTotalOpeningDebit: 0,
    grandTotalOpeningCredit: 0,
    grandTotalPeriodDebit: 0,
    grandTotalPeriodCredit: 0,
    grandTotalClosingDebit: 0,
    grandTotalClosingCredit: 0,
    difference: 0,
    isBalanced: true,
  };

  return (
    <div className="space-y-6 trial-balance-container">
      {/* ── Header Section ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-5 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100/70 text-emerald-800 rounded-lg">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-h2 font-display text-[var(--color-charcoal)]">Trial Balance</h1>
              <p className="text-xs text-[var(--color-slate)] mt-0.5">
                Consolidated balance sheet of all clients, brokers, and account master closing rates up to date.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchReport(toDate || undefined)}
            disabled={loading}
            className="btn btn--secondary flex items-center gap-1.5 text-xs py-2 px-3"
            title="Refresh trial balance data"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn--secondary flex items-center gap-1.5 text-xs py-2 px-3 text-emerald-700 hover:text-emerald-800"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="btn btn--primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-xs"
            title="Print Trial Balance"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* ── Print Header (Only visible on paper / PDF print) ─────── */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-serif text-black">FINANCIAL ACCOUNTING SOFTWARE</h1>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-widest mt-1">Trial Balance Statement</h2>
          <p className="text-xs text-gray-600 mt-1">
            As on Date: <strong>{toDate || new Date().toLocaleDateString('en-GB')}</strong> | Generated on: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Top KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Total Debit Balance */}
        <div className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Debit (Dr)</span>
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5] text-[var(--color-forest)] transition-all group-hover:scale-105">
              <ArrowDownRight className="w-5 h-5 stroke-[1.75]" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="font-mono text-2xl font-bold text-[var(--color-charcoal)] leading-tight tracking-tight">
              ₹{summary.grandTotalClosingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs font-medium text-[var(--color-slate)]">
              <span>Debit Balances Across Accounts</span>
              <span className="font-bold text-[var(--color-forest)] bg-[var(--color-mist)] px-2 py-0.5 rounded-md text-[10px]">Dr Side</span>
            </div>
          </div>
        </div>

        {/* Total Credit Balance */}
        <div className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Credit (Cr)</span>
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 transition-all group-hover:scale-105">
              <ArrowUpRight className="w-5 h-5 stroke-[1.75]" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="font-mono text-2xl font-bold text-emerald-800 leading-tight tracking-tight">
              ₹{summary.grandTotalClosingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs font-medium text-[var(--color-slate)]">
              <span>Credit Balances Across Accounts</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[10px]">Cr Side</span>
            </div>
          </div>
        </div>

        {/* Trial Balance Status (Balanced or Diff) */}
        <div className={cn(
          'group relative overflow-hidden bg-white p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-300',
          summary.isBalanced ? 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/20' : 'border-rose-200 bg-rose-50/20'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Balance Validation</span>
            <span className={cn(
              'p-2.5 rounded-xl bg-gradient-to-br transition-all group-hover:scale-105',
              summary.isBalanced ? 'from-emerald-50 to-emerald-100 text-emerald-600' : 'from-rose-50 to-rose-100 text-rose-600'
            )}>
              {summary.isBalanced ? (
                <CheckCircle2 className="w-5 h-5 stroke-[1.75]" />
              ) : (
                <AlertTriangle className="w-5 h-5 stroke-[1.75]" />
              )}
            </span>
          </div>
          <div className="mt-3">
            <h3 className={cn(
              'font-mono text-2xl font-bold leading-tight tracking-tight',
              summary.isBalanced ? 'text-emerald-700' : 'text-rose-700'
            )}>
              {summary.isBalanced ? 'TALLY BALANCED' : `DIFF: ₹${summary.difference.toFixed(2)}`}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs font-medium text-[var(--color-slate)]">
              <span>Dr Total - Cr Total Match</span>
              <span className={cn(
                'px-2 py-0.5 rounded-md font-bold text-[10px]',
                summary.isBalanced ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100 text-rose-800'
              )}>
                {summary.isBalanced ? '✓ 0.00 Diff' : `Discrepancy ₹${summary.difference.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Total Accounts & Active Count */}
        <div className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Accounts</span>
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 transition-all group-hover:scale-105">
              <Users className="w-5 h-5 stroke-[1.75]" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-mono text-2xl font-bold text-slate-900 leading-tight tracking-tight">{summary.totalAccounts}</h3>
              <span className="text-xs text-slate-500 font-medium">accounts</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs font-medium text-[var(--color-slate)]">
              <span>Active Accounts</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md text-[10px]">{summary.activeAccounts} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Quick Filter Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
        {/* All Tab */}
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden',
            selectedCategory === 'ALL'
              ? 'bg-emerald-50/80 text-emerald-950 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">All Accounts</span>
            <div className={cn('p-1 rounded-md', selectedCategory === 'ALL' ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-100 text-slate-500')}>
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl font-mono font-bold text-slate-900">{report?.rows?.length || 0}</span>
            <div className="text-right text-[11px] font-mono leading-tight text-slate-600">
              <div>Dr: ₹{summary.grandTotalClosingDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div>Cr: ₹{summary.grandTotalClosingCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </button>

        {/* Clients Card */}
        {(() => {
          const cat = report?.categories?.find((c) => c.category === 'CLIENT');
          const isSel = selectedCategory === 'CLIENT';
          return (
            <button
              type="button"
              onClick={() => setSelectedCategory('CLIENT')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden',
                isSel
                  ? 'bg-emerald-50/80 text-emerald-950 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Clients (Debtors)</span>
                <div className={cn('p-1 rounded-md', isSel ? 'bg-emerald-200/60 text-emerald-800' : 'bg-emerald-50 text-emerald-600')}>
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-xl font-mono font-bold text-slate-900">{cat?.accountCount || 0}</span>
                <div className="text-right text-[11px] font-mono leading-tight text-slate-600">
                  <div>Dr: ₹{(cat?.totalClosingDebit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <div>Cr: ₹{(cat?.totalClosingCredit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </button>
          );
        })()}

        {/* Brokers Card */}
        {(() => {
          const cat = report?.categories?.find((c) => c.category === 'BROKER');
          const isSel = selectedCategory === 'BROKER';
          return (
            <button
              type="button"
              onClick={() => setSelectedCategory('BROKER')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden',
                isSel
                  ? 'bg-indigo-50/80 text-indigo-950 border-indigo-600 shadow-xs ring-1 ring-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Brokers (Creditors)</span>
                <div className={cn('p-1 rounded-md', isSel ? 'bg-indigo-200/60 text-indigo-800' : 'bg-indigo-50 text-indigo-600')}>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-xl font-mono font-bold text-slate-900">{cat?.accountCount || 0}</span>
                <div className="text-right text-[11px] font-mono leading-tight text-slate-600">
                  <div>Dr: ₹{(cat?.totalClosingDebit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <div>Cr: ₹{(cat?.totalClosingCredit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </button>
          );
        })()}

        {/* Account Masters Card */}
        {(() => {
          const cat = report?.categories?.find((c) => c.category === 'ACCOUNT_MASTER');
          const isSel = selectedCategory === 'ACCOUNT_MASTER';
          return (
            <button
              type="button"
              onClick={() => setSelectedCategory('ACCOUNT_MASTER')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden',
                isSel
                  ? 'bg-slate-100 text-slate-950 border-slate-600 shadow-xs ring-1 ring-slate-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Other Masters</span>
                <div className={cn('p-1 rounded-md', isSel ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500')}>
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-xl font-mono font-bold text-slate-900">{cat?.accountCount || 0}</span>
                <div className="text-right text-[11px] font-mono leading-tight text-slate-600">
                  <div>Dr: ₹{(cat?.totalClosingDebit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <div>Cr: ₹{(cat?.totalClosingCredit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </button>
          );
        })()}
      </div>

      {/* ── Interactive Filter & Search Bar ──────────────────────── */}
      <div className="card bg-white p-4 border border-slate-200 shadow-xs space-y-3 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box with Column Selector */}
          <div className="flex items-center bg-white border border-[var(--color-border-medium)] rounded-lg shadow-2xs hover:border-[var(--color-border-focus)] focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/15 transition-all flex-1 min-w-[280px]">
            <div className="w-[130px] shrink-0 border-r border-[var(--color-border-light)]">
              <UniversalDropdown
                value={searchColumn}
                onChange={(val) => setSearchColumn(val)}
                searchable={false}
                options={[
                  { value: 'ALL', label: 'All Columns' },
                  { value: 'code', label: 'Account Code' },
                  { value: 'name', label: 'Account Name' },
                  { value: 'groupName', label: 'Group' },
                ]}
                triggerClassName="min-h-[34px] h-[34px] rounded-none rounded-l-lg border-0 bg-slate-50/70 hover:bg-slate-100 shadow-none px-2 text-[11px] font-semibold text-[var(--color-charcoal)]"
              />
            </div>
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search accounts..."
                className="w-full h-8.5 px-2.5 text-xs bg-transparent text-[var(--color-charcoal)] placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 mr-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Group Filter */}
          <div className="w-full sm:w-56">
            <UniversalDropdown
              options={groupOptions}
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              placeholder="-- All Groups --"
            />
          </div>

          {/* As Of Date */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">As of:</span>
              <UniversalDatePicker
                value={toDate}
                onChange={(d) => handleDateChange(d)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            {toDate && (
              <button
                onClick={() => handleDateChange('')}
                className="text-[11px] text-[var(--color-forest)] hover:underline px-1 whitespace-nowrap"
              >
                Reset to All-Time
              </button>
            )}
          </div>
        </div>

        {/* Secondary Toggles & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border-light)] text-xs">
          <div className="flex items-center gap-4">
            {/* Hide Zero Balance Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-[var(--color-charcoal)]">
              <CustomCheckbox
                checked={hideZeroBalance}
                onChange={(checked) => setHideZeroBalance(checked)}
              />
              <span>Hide Nil / Zero Balance Accounts</span>
            </label>

            {/* Group By Category Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-[var(--color-charcoal)]">
              <CustomCheckbox
                checked={groupByCategory}
                onChange={(checked) => setGroupByCategory(checked)}
              />
              <span>Category Sub-headings</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">View:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                  viewMode === 'standard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Standard (Closing)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                  viewMode === 'detailed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Detailed (Opening + Movements)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Trial Balance Table Card ─────────────────────────── */}
      <div className="card shadow-xs border border-slate-200 bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="whitespace-nowrap bg-slate-50 text-slate-700 border-b border-slate-200">
                <th style={{ width: '110px' }} className="text-left py-3 px-3.5">
                  Code
                </th>
                <th className="text-left py-3 px-3.5">Account / Entity Name</th>
                <th style={{ width: '140px' }} className="text-left py-3 px-3.5">
                  Group
                </th>
                {viewMode === 'detailed' && (
                  <>
                    <th style={{ width: '130px' }} className="text-right py-3 px-3.5">
                      Opening Balance
                    </th>
                    <th style={{ width: '120px' }} className="text-right py-3 px-3.5">
                      Period Dr
                    </th>
                    <th style={{ width: '120px' }} className="text-right py-3 px-3.5">
                      Period Cr
                    </th>
                  </>
                )}
                <th
                  style={{ width: '140px' }}
                  className="text-right py-3 px-3.5 bg-slate-50/90 text-slate-800 font-bold border-l border-slate-200"
                >
                  Closing Debit (Dr)
                </th>
                <th
                  style={{ width: '140px' }}
                  className="text-right py-3 px-3.5 bg-emerald-50/50 text-emerald-900 font-bold border-r border-slate-200"
                >
                  Closing Credit (Cr)
                </th>
                <th style={{ width: '110px' }} className="text-center py-3 px-3 no-print">
                  Passbook
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'detailed' ? 9 : 6} className="py-16 text-center text-slate-400 font-medium">
                    <Scale className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No accounts found matching your filter criteria.
                  </td>
                </tr>
              ) : null}

              {/* Categorized Render */}
              {groupByCategory && groupedData
                ? groupedData.map((group) => (
                    <RenderCategoryGroup
                      key={group.category}
                      group={group}
                      viewMode={viewMode}
                    />
                  ))
                : filteredRows.map((row) => (
                    <RenderAccountRow
                      key={row.id}
                      row={row}
                      viewMode={viewMode}
                    />
                  ))}
            </tbody>

            {/* ── Grand Total & Balanced Verification Footer ────────── */}
            <tfoot>
              <tr className="bg-slate-100/90 text-slate-900 font-bold text-xs border-t-2 border-slate-300">
                <td colSpan={viewMode === 'detailed' ? 3 : 2} className="py-3.5 px-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 uppercase tracking-wider">
                      GRAND TOTAL ({filteredRows.length} Accounts)
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                        visibleSummary.isBalanced
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      )}
                    >
                      {visibleSummary.isBalanced ? '✓ Balanced' : `Diff: ₹${visibleSummary.difference.toFixed(2)}`}
                    </span>
                  </div>
                </td>

                {viewMode === 'detailed' && (
                  <>
                    <td className="text-right py-3.5 px-3.5 font-mono text-slate-700">
                      {visibleSummary.totalOpeningDr > 0 && `Dr: ₹${visibleSummary.totalOpeningDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      {visibleSummary.totalOpeningCr > 0 && ` | Cr: ₹${visibleSummary.totalOpeningCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </td>
                    <td className="text-right py-3.5 px-3.5 font-mono text-slate-700">
                      ₹{visibleSummary.totalPeriodDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-3.5 px-3.5 font-mono text-slate-700">
                      ₹{visibleSummary.totalPeriodCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </>
                )}

                {/* Closing Debit Grand Total */}
                <td className="text-right py-3.5 px-3.5 font-mono text-sm text-slate-900 bg-slate-100/90 border-l border-r border-slate-200 font-bold">
                  ₹{visibleSummary.totalClosingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>

                {/* Closing Credit Grand Total */}
                <td className="text-right py-3.5 px-3.5 font-mono text-sm text-emerald-700 bg-emerald-50/80 border-r border-emerald-200/60 font-bold">
                  ₹{visibleSummary.totalClosingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>

                <td className="no-print text-center py-3.5 px-3 text-[11px] font-semibold">
                  {visibleSummary.isBalanced ? (
                    <span className="text-emerald-700 font-bold">Matched</span>
                  ) : (
                    <span className="text-rose-600 font-bold">Unbalanced</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component for rendering a category group with subtotals ──
function RenderCategoryGroup({
  group,
  viewMode,
}: {
  group: {
    category: string;
    label: string;
    rows: TrialBalanceAccountRow[];
    totalDr: number;
    totalCr: number;
  };
  viewMode: 'standard' | 'detailed';
}) {
  return (
    <>
      {/* Category Section Header */}
      <tr className="bg-slate-100/80 text-slate-800 font-bold border-y border-slate-200">
        <td colSpan={viewMode === 'detailed' ? 9 : 6} className="py-2 px-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 uppercase tracking-wider text-[11px] text-slate-900 font-bold">
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              {group.label}
              <span className="font-normal text-slate-500 text-[10px]">({group.rows.length} accounts)</span>
            </span>
            <div className="flex items-center gap-4 text-[11px] font-mono font-semibold">
              <span className="text-slate-800">Dr Subtotal: ₹{group.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-emerald-900">Cr Subtotal: ₹{group.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </td>
      </tr>

      {/* Account Rows */}
      {group.rows.map((row) => (
        <RenderAccountRow key={row.id} row={row} viewMode={viewMode} />
      ))}
    </>
  );
}

// ── Sub-component for rendering individual account row ──────────
function RenderAccountRow({
  row,
  viewMode,
}: {
  row: TrialBalanceAccountRow;
  viewMode: 'standard' | 'detailed';
}) {
  const hasBalance = row.closingDebit > 0 || row.closingCredit > 0;

  return (
    <tr className={cn('hover:bg-slate-50/80 transition-colors whitespace-nowrap', !hasBalance && 'opacity-60 bg-slate-50/30')}>
      {/* Code */}
      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
        <Link
          href={`/ledger?accountId=${row.id}`}
          className="hover:text-[var(--color-forest)] transition-colors hover:underline"
          title="Open ledger statement for this account"
        >
          {row.code}
        </Link>
      </td>

      {/* Name */}
      <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-[280px] truncate" title={row.name}>
        <Link
          href={`/ledger?accountId=${row.id}`}
          className="hover:text-[var(--color-forest)] transition-colors"
        >
          {row.name}
        </Link>
      </td>

      {/* Group */}
      <td className="py-2.5 px-3.5">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
            row.category === 'CLIENT' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
            row.category === 'BROKER' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
            row.category === 'ACCOUNT_MASTER' && 'bg-slate-100 text-slate-700 border-slate-200'
          )}
        >
          {row.groupName}
        </span>
      </td>

      {/* Detailed Columns */}
      {viewMode === 'detailed' && (
        <>
          {/* Opening Balance */}
          <td className="py-2.5 px-3.5 text-right font-mono text-xs">
            {row.openingBalance === 0 ? (
              <span className="text-slate-400">0.00</span>
            ) : row.openingBalance < 0 ? (
              <span className="text-rose-600">
                ₹{Math.abs(row.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Dr)
              </span>
            ) : (
              <span className="text-emerald-600">
                ₹{row.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Cr)
              </span>
            )}
          </td>

          {/* Period Debit */}
          <td className="py-2.5 px-3.5 text-right font-mono text-xs text-slate-600">
            {row.periodDebit > 0 ? `₹${row.periodDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          </td>

          {/* Period Credit */}
          <td className="py-2.5 px-3.5 text-right font-mono text-xs text-slate-600">
            {row.periodCredit > 0 ? `₹${row.periodCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          </td>
        </>
      )}

      {/* Closing Debit (Dr) */}
      <td
        className={cn(
          'py-2.5 px-3.5 text-right font-mono text-xs font-bold border-l border-slate-100',
          row.closingDebit > 0 ? 'text-slate-900 bg-slate-100/40' : 'text-slate-300'
        )}
      >
        {row.closingDebit > 0 ? `₹${row.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
      </td>

      {/* Closing Credit (Cr) */}
      <td
        className={cn(
          'py-2.5 px-3.5 text-right font-mono text-xs font-bold border-r border-slate-100',
          row.closingCredit > 0 ? 'text-emerald-700 bg-emerald-50/20' : 'text-slate-300'
        )}
      >
        {row.closingCredit > 0 ? `₹${row.closingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
      </td>

      {/* Row Action: View Ledger */}
      <td className="py-2.5 px-3 text-center no-print" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/ledger?accountId=${row.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-600 hover:text-[var(--color-forest)] hover:bg-[var(--color-mist)] transition-colors"
          title="Open Ledger Passbook for this account"
        >
          <span>Ledger</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </Link>
      </td>
    </tr>
  );
}
