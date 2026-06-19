'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { BookOpen, Search, Calendar, Scale, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';
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
  date: string;
  particulars: string;
  type: string;
  amount: number;
  runningBalance: number;
}

interface LedgerReportData {
  account: {
    id: string;
    code: string;
    name: string;
    group: string;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerTransaction[];
}

export function LedgerReportManager({ accounts }: { accounts: Account[] }) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<LedgerReportData | null>(null);

  useEffect(() => {
    // Set default date range to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast.error('Please select an account');
      return;
    }
    if (!fromDate || !toDate) {
      toast.error('Please select both From and To dates');
      return;
    }

    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/ledger-report?accountId=${selectedAccountId}&fromDate=${fromDate}&toDate=${toDate}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        toast.success('Ledger report generated successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to generate ledger report');
      }
    } catch {
      toast.error('Failed to connect to the backend server');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate totals in the period
  const totals = useMemo(() => {
    if (!reportData) return { debits: 0, credits: 0 };
    let debits = 0;
    let credits = 0;
    for (const tx of reportData.transactions) {
      if (tx.amount < 0) {
        debits += Math.abs(tx.amount);
      } else {
        credits += tx.amount;
      }
    }
    return { debits, credits };
  }, [reportData]);

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
    <div className="space-y-8 print:p-0 print:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6 print:border-b-2 print:pb-4">
        <div>
          <h1 className="text-h2 font-display flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[var(--color-primary)]" />
            Ledger Statement
          </h1>
          <p className="text-sm text-[var(--color-slate)] mt-1 print:hidden">
            View chronological, double-entry statement ledger balances and trade settlement sheets for any account.
          </p>
        </div>

        {reportData && (
          <button
            onClick={handlePrint}
            className="btn btn--secondary flex items-center gap-2 self-start md:self-auto print:hidden"
          >
            <Printer className="w-4 h-4 text-[var(--color-primary)]" /> Print Statement
          </button>
        )}
      </div>

      {/* Filter / Selector Panel */}
      <div className="card shadow-sm border border-[var(--color-border-light)] bg-white p-6 print:hidden">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="form-field md:col-span-2">
            <label className="form-label form-label--required">Select Account Master</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="input pl-10 w-full text-slate-900"
                disabled={loading}
              >
                <option value="" disabled>Choose account...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({acc.group?.name || 'General'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label form-label--required">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="input pl-10 w-full"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label form-label--required">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="input pl-10 w-full"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn--primary h-[42px] px-6 flex items-center justify-center gap-2 w-full font-bold shadow-sm"
          >
            Generate Report
          </button>
        </form>
      </div>

      {/* Report Output */}
      {reportData ? (
        <div className="space-y-6">
          {/* Metadata Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Account Info Card */}
            <div className="card shadow-sm border border-[var(--color-border-light)] p-5 md:col-span-1 bg-white">
              <div className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Account Details</div>
              <h3 className="text-lg font-bold text-[var(--color-charcoal)] mt-2 font-display">{reportData.account.name}</h3>
              <div className="text-xs font-mono font-medium text-[var(--color-slate)] mt-1">{reportData.account.code}</div>
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                  {reportData.account.group}
                </span>
              </div>
            </div>

            {/* Opening Balance Card */}
            <div className="card shadow-sm border border-[var(--color-border-light)] p-5 bg-white">
              <div className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Opening Balance</div>
              <h3 className="text-xl font-bold mt-3 font-display">
                {renderBalance(reportData.openingBalance)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Balance before {new Date(fromDate).toLocaleDateString('en-GB')}</p>
            </div>

            {/* Transaction Activity Card */}
            <div className="card shadow-sm border border-[var(--color-border-light)] p-5 bg-white">
              <div className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Period Activity</div>
              <div className="mt-3 space-y-1">
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
            <div className="card shadow-sm border border-[var(--color-border-light)] p-5 bg-white">
              <div className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Closing Balance</div>
              <h3 className="text-xl font-bold mt-3 font-display">
                {renderBalance(reportData.closingBalance)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Balance on {new Date(toDate).toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* Running Transactions Ledger */}
          <div className="card shadow-sm border border-[var(--color-border-light)] bg-white p-0">
            <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center">
              <h3 className="text-md font-bold text-[var(--color-charcoal)]">Transaction Statement</h3>
              <span className="text-xs font-semibold text-slate-400">
                {new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Date</th>
                    <th>Particulars / Voucher Type</th>
                    <th style={{ width: '80px' }}>Type</th>
                    <th style={{ width: '130px' }} className="text-right">Debit (Dr)</th>
                    <th style={{ width: '130px' }} className="text-right">Credit (Cr)</th>
                    <th style={{ width: '160px' }} className="text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/50 italic text-slate-500 border-b border-slate-100">
                    <td className="text-xs">
                      {new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="text-xs font-semibold" colSpan={2}>
                      Opening Balance Brought Forward
                    </td>
                    <td className="text-right font-mono text-xs">—</td>
                    <td className="text-right font-mono text-xs">—</td>
                    <td className="text-right font-mono font-medium text-xs">
                      {renderBalance(reportData.openingBalance)}
                    </td>
                  </tr>

                  {/* Transactions Rows */}
                  {reportData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                        No transactions recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    reportData.transactions.map((tx, idx) => {
                      const isDr = tx.amount < 0;
                      const isCr = tx.amount > 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="text-xs text-[var(--color-charcoal)] font-medium">
                            {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="text-xs font-medium text-[var(--color-charcoal)] max-w-[320px] truncate" title={tx.particulars}>
                            {tx.particulars}
                          </td>
                          <td>
                            <span className={cn(
                              "badge text-[9px] font-bold uppercase py-0.5 px-1.5",
                              tx.type === 'TRADE' && "badge--success",
                              tx.type === 'PAYMENT' && "badge--warning",
                              tx.type === 'RECEIPT' && "badge--success bg-emerald-100 text-emerald-800",
                              tx.type === 'JOURNAL' && "badge--neutral",
                              tx.type === 'CONTRA' && "badge--secondary"
                            )}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="text-right font-mono text-xs font-semibold text-[var(--color-negative)]">
                            {isDr ? `₹${Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="text-right font-mono text-xs font-semibold text-[var(--color-forest)]">
                            {isCr ? `₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="text-right font-mono text-xs font-semibold">
                            {renderBalance(tx.runningBalance)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Summary / Summary Footer */}
                  <tr className="bg-slate-100/60 font-semibold border-t-2 border-slate-200">
                    <td className="text-right text-xs font-bold text-[var(--color-charcoal)]" colSpan={3}>
                      Totals & Net Activity:
                    </td>
                    <td className="text-right font-mono text-xs font-bold text-[var(--color-negative)]">
                      ₹{totals.debits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono text-xs font-bold text-[var(--color-forest)]">
                      ₹{totals.credits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono text-xs font-bold">
                      {renderBalance(reportData.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-md font-bold text-slate-700">No Statement Generated</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Select an account master and target date range above, then click "Generate Report" to build the chronological ledger statement.
          </p>
        </div>
      )}
    </div>
  );
}
