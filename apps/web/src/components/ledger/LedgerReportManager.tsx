'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  BookOpen, Search, Calendar, Scale, ArrowUpRight, ArrowDownRight, 
  Printer, Download, RefreshCw, X, Filter, FileText, CheckCircle2, UserCheck
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface Account {
  id: string;
  code: string;
  name: string;
  group?: {
    name: string;
  };
}

interface LedgerTransaction {
  id?: string;
  date: string;
  particulars: string;
  type: string;
  entryType: string;
  referenceId?: string;
  amount: number;
  credit: number;
  debit: number;
  balance: number;
  runningBalance: number;
}

interface LedgerReportData {
  account: {
    id: string;
    code: string;
    name: string;
    group: string;
    openingBalance: number;
  };
  period: {
    fromDate: string | null;
    toDate: string | null;
  };
  openingBalance: number;
  closingBalance: number;
  totalCredit: number;
  totalDebit: number;
  netMovement: number;
  transactions: LedgerTransaction[];
}

export function LedgerReportManager({ accounts }: { accounts: Account[] }) {
  // Account selection state - starts with NO account selected
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  // Date and filter states (applied after account is selected)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'ALL' | 'SETTLEMENT' | 'VOUCHER'>('ALL');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<LedgerReportData | null>(null);

  // Fetch report function
  const fetchReport = useCallback(async (accountId: string, fDate?: string, tDate?: string) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ accountId });
      if (fDate) params.set('fromDate', fDate);
      if (tDate) params.set('toDate', tDate);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ledger-report?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to fetch ledger report');
      }
    } catch {
      toast.error('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, []);

  // When user selects an account, generate immediately
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    if (!accountId) {
      setReportData(null);
      return;
    }
    // Fetch with current date filters (if set) or full history
    fetchReport(accountId, fromDate || undefined, toDate || undefined);
  };

  // Re-fetch when date range changes and an account is active
  const handleDateChange = (newFromDate: string, newToDate: string) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    if (selectedAccountId) {
      fetchReport(selectedAccountId, newFromDate || undefined, newToDate || undefined);
    }
  };

  // Quick Date Range Presets
  const handlePreset = (preset: 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY') => {
    const today = new Date();
    let f = '';
    let t = '';

    if (preset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      f = first.toISOString().split('T')[0];
      t = today.toISOString().split('T')[0];
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      f = first.toISOString().split('T')[0];
      t = last.toISOString().split('T')[0];
    } else if (preset === 'THIS_FY') {
      const curYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      f = `${curYear}-04-01`;
      t = `${curYear + 1}-03-31`;
    } else if (preset === 'ALL') {
      f = '';
      t = '';
    }

    handleDateChange(f, t);
  };

  // Client-side filtering of transactions
  const filteredTransactions = useMemo(() => {
    if (!reportData) return [];
    return reportData.transactions.filter((tx) => {
      const matchesSearch =
        !searchQuery ||
        tx.particulars.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.referenceId && tx.referenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        Math.abs(tx.amount).toString().includes(searchQuery);

      const matchesType =
        entryTypeFilter === 'ALL' ||
        (entryTypeFilter === 'SETTLEMENT' && (tx.entryType === 'SETTLEMENT' || tx.type === 'TRADE')) ||
        (entryTypeFilter === 'VOUCHER' && (tx.entryType === 'VOUCHER' || tx.type !== 'TRADE' && tx.entryType !== 'SETTLEMENT'));

      return matchesSearch && matchesType;
    });
  }, [reportData, searchQuery, entryTypeFilter]);

  // Calculate period totals from filtered transactions
  const totals = useMemo(() => {
    if (!filteredTransactions) return { debits: 0, credits: 0 };
    let debits = 0;
    let credits = 0;
    for (const tx of filteredTransactions) {
      if (tx.amount < 0) {
        debits += Math.abs(tx.amount);
      } else {
        credits += tx.amount;
      }
    }
    return { debits, credits };
  }, [filteredTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [
      ['Date', 'Particulars', 'Entry Type', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance'],
      [
        reportData.period.fromDate ? new Date(reportData.period.fromDate).toLocaleDateString('en-GB') : 'Initial',
        'Opening Balance Brought Forward',
        'OPENING',
        '',
        '',
        reportData.openingBalance.toFixed(2),
      ],
      ...filteredTransactions.map((tx) => [
        new Date(tx.date).toLocaleDateString('en-GB'),
        `"${tx.particulars.replace(/"/g, '""')}"`,
        tx.entryType || tx.type,
        tx.amount < 0 ? Math.abs(tx.amount).toFixed(2) : '',
        tx.amount > 0 ? tx.amount.toFixed(2) : '',
        (tx.balance ?? tx.runningBalance).toFixed(2),
      ]),
      [
        'Total',
        'Period Totals',
        '',
        totals.debits.toFixed(2),
        totals.credits.toFixed(2),
        reportData.closingBalance.toFixed(2),
      ],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ledger_${reportData.account.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderBalance = (amount: number) => {
    const abs = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (amount < 0) {
      return (
        <span className="font-mono font-semibold text-[var(--color-negative)]">
          ₹{abs} <span className="text-[10px] font-bold">Dr</span>
        </span>
      );
    } else if (amount > 0) {
      return (
        <span className="font-mono font-semibold text-[var(--color-forest)]">
          ₹{abs} <span className="text-[10px] font-bold">Cr</span>
        </span>
      );
    } else {
      return <span className="font-mono text-slate-400">₹0.00</span>;
    }
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Top Header & Account Dropdown */}
      <div className="card border border-[var(--color-border-light)] bg-white p-5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-display flex items-center gap-2 text-slate-900">
              <BookOpen className="w-6 h-6 text-[var(--color-primary)] shrink-0" />
              Ledger Statement
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 print:hidden">
              Select an account to view live double-entry passbook balances, settlements, and vouchers.
            </p>
          </div>

          {reportData && (
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="btn btn--secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                title="Export as CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" /> Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="btn btn--secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                title="Print passbook statement"
              >
                <Printer className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Print
              </button>
            </div>
          )}
        </div>

        {/* Primary Account Selector Dropdown */}
        <div className="pt-2 border-t border-slate-100 print:hidden">
          <div className="relative max-w-2xl">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="input pl-10 pr-10 w-full text-sm font-semibold bg-slate-50 hover:bg-white focus:bg-white text-slate-900 border-slate-300 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <option value="" disabled>
                -- Choose Account (Client / Broker / Account Master) --
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name} ({acc.group?.name || 'General'})
                </option>
              ))}
            </select>
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay State */}
      {loading && !reportData && (
        <div className="card p-16 text-center border border-slate-200 bg-white rounded-xl shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Loading Ledger Statement...</h3>
          <p className="text-xs text-slate-400">Computing opening balances, settlements, and double-entry postings.</p>
        </div>
      )}

      {/* Empty State when no account is selected */}
      {!selectedAccountId && !loading && (
        <div className="card p-14 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/60 space-y-3">
          <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs text-[var(--color-primary)]">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Select an Account to View Statement</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose any Client or Broker account from the dropdown above. The passbook report will be generated instantly with running balances and double-entry entries.
          </p>
        </div>
      )}

      {/* Report Content when Account is Selected */}
      {reportData && selectedAccountId && (
        <div className="space-y-6">
          {/* Metadata Summary Banner & KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Info Card */}
            <div className="card shadow-xs border border-slate-200 p-4 bg-white rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Master</div>
              <h3 className="text-base font-bold text-slate-900 mt-1 font-display truncate" title={reportData.account.name}>
                {reportData.account.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {reportData.account.code}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {reportData.account.group}
                </span>
              </div>
            </div>

            {/* Opening Balance Card */}
            <div className="card shadow-xs border border-slate-200 p-4 bg-white rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opening Balance</div>
              <div className="text-lg font-bold mt-1 font-display">
                {renderBalance(reportData.openingBalance)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {reportData.period.fromDate 
                  ? `Brought forward before ${new Date(reportData.period.fromDate).toLocaleDateString('en-GB')}`
                  : 'Master base opening balance'}
              </p>
            </div>

            {/* Total Period Activity */}
            <div className="card shadow-xs border border-slate-200 p-4 bg-white rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Period Activity</div>
              <div className="mt-1 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-[var(--color-negative)]" /> Total Debits (Dr)
                  </span>
                  <span className="font-mono font-bold text-[var(--color-negative)]">
                    ₹{totals.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-forest)]" /> Total Credits (Cr)
                  </span>
                  <span className="font-mono font-bold text-[var(--color-forest)]">
                    ₹{totals.credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Closing Balance Card */}
            <div className="card shadow-xs border border-slate-200 p-4 bg-white rounded-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Closing Balance</div>
              <div className="text-lg font-bold mt-1 font-display">
                {renderBalance(reportData.closingBalance)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {reportData.period.toDate 
                  ? `Balance as of ${new Date(reportData.period.toDate).toLocaleDateString('en-GB')}`
                  : 'Current running balance'}
              </p>
            </div>
          </div>

          {/* Interactive Filters Bar (Date Filters, Type, Search) */}
          <div className="card border border-slate-200 bg-white p-4 shadow-xs space-y-3 rounded-xl print:hidden">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter Statement Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* From Date */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleDateChange(e.target.value, toDate)}
                    className="input pl-8 py-1.5 text-xs w-full"
                  />
                </div>
              </div>

              {/* To Date */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => handleDateChange(fromDate, e.target.value)}
                    className="input pl-8 py-1.5 text-xs w-full"
                  />
                </div>
              </div>

              {/* Search Particulars */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Search Particulars / Ref</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search entry description..."
                    className="input pl-8 py-1.5 text-xs w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Entry Type Filter */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Entry Type</label>
                <select
                  value={entryTypeFilter}
                  onChange={(e) => setEntryTypeFilter(e.target.value as any)}
                  className="input py-1.5 text-xs w-full cursor-pointer"
                >
                  <option value="ALL">All Entries (Settlement & Vouchers)</option>
                  <option value="SETTLEMENT">Settlement Cycles Only</option>
                  <option value="VOUCHER">Vouchers Only</option>
                </select>
              </div>
            </div>

            {/* Quick Presets and Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handlePreset('ALL')}
                  className={cn(
                    'px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer',
                    !fromDate && !toDate
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  )}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('THIS_MONTH')}
                  className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('LAST_MONTH')}
                  className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('THIS_FY')}
                  className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Financial Year
                </button>
              </div>

              {(fromDate || toDate || searchQuery || entryTypeFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setEntryTypeFilter('ALL');
                    handlePreset('ALL');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Running Transactions Passbook Table */}
          <div className="card shadow-xs border border-slate-200 bg-white p-0 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Passbook Transactions ({filteredTransactions.length})
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {reportData.period.fromDate 
                    ? `${new Date(reportData.period.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(reportData.period.toDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : 'Complete Account History'}
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-600">
                Closing: {renderBalance(reportData.closingBalance)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                    <th style={{ width: '110px' }} className="p-3">Date</th>
                    <th className="p-3">Particulars / Description</th>
                    <th style={{ width: '100px' }} className="p-3 text-center">Type</th>
                    <th style={{ width: '130px' }} className="p-3 text-right">Debit (Dr)</th>
                    <th style={{ width: '130px' }} className="p-3 text-right">Credit (Cr)</th>
                    <th style={{ width: '150px' }} className="p-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/60 italic text-slate-600 font-medium">
                    <td className="p-3 font-mono text-xs">
                      {reportData.period.fromDate 
                        ? new Date(reportData.period.fromDate).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="p-3 font-semibold" colSpan={2}>
                      Opening Balance Brought Forward
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-slate-400">—</td>
                    <td className="p-3 text-right font-mono text-xs text-slate-400">—</td>
                    <td className="p-3 text-right font-mono font-bold text-xs">
                      {renderBalance(reportData.openingBalance)}
                    </td>
                  </tr>

                  {/* Transactions Rows */}
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                        No transactions recorded matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => {
                      const isDr = tx.amount < 0;
                      const isCr = tx.amount > 0;

                      return (
                        <tr key={tx.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono text-xs text-slate-700 font-medium">
                            {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3 font-medium text-slate-800 max-w-[380px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={tx.particulars}>
                                {tx.particulars}
                              </span>
                              {tx.referenceId && tx.entryType === 'SETTLEMENT' && (
                                <a
                                  href={`/settlement?settlementId=${tx.referenceId}&search=${encodeURIComponent(reportData.account.code)}`}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors shrink-0 print:hidden"
                                  title="View settlement trades for this account"
                                >
                                  <span>View Settlement</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </a>
                              )}
                              {tx.referenceId && tx.entryType === 'VOUCHER' && (
                                <a
                                  href={`/vouchers?search=${tx.referenceId}`}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors shrink-0 print:hidden"
                                  title="View Voucher"
                                >
                                  <span>View Voucher</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                'badge text-[10px] font-bold uppercase py-0.5 px-2 rounded-full',
                                (tx.entryType === 'SETTLEMENT' || tx.type === 'TRADE') && 'bg-emerald-100 text-emerald-800 border border-emerald-200',
                                (tx.entryType === 'VOUCHER' || tx.type === 'PAYMENT') && 'bg-amber-100 text-amber-800 border border-amber-200',
                                tx.type === 'RECEIPT' && 'bg-blue-100 text-blue-800 border border-blue-200',
                                tx.type === 'JOURNAL' && 'bg-slate-100 text-slate-700 border border-slate-200',
                                tx.type === 'CONTRA' && 'bg-purple-100 text-purple-800 border border-purple-200'
                              )}
                            >
                              {tx.entryType || tx.type}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-xs font-bold text-[var(--color-negative)]">
                            {isDr ? `₹${Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-xs font-bold text-[var(--color-forest)]">
                            {isCr ? `₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-xs font-bold">
                            {renderBalance(tx.balance ?? tx.runningBalance)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Summary / Summary Footer */}
                  <tr className="bg-slate-100/80 font-semibold border-t-2 border-slate-300">
                    <td className="p-3 text-right text-xs font-bold text-slate-900" colSpan={3}>
                      Totals & Net Activity:
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-[var(--color-negative)]">
                      ₹{totals.debits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold text-[var(--color-forest)]">
                      ₹{totals.credits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-bold">
                      {renderBalance(reportData.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
