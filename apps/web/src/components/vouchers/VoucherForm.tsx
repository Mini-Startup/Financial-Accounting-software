'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, AlertCircle, CheckCircle, Scale, Calendar, FileText, Plus, ArrowRightLeft, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Account {
  id: string;
  code: string;
  name: string;
  group?: {
    name: string;
  };
}

interface VoucherLineItem {
  id: string;
  accountId: string;
  amount: string; // absolute value string
  isDebit: boolean; // true = Dr (negative), false = Cr (positive)
}

interface ApiVoucherLine {
  id: string;
  accountId: string;
  amount: number;
  account: Account;
}

interface Voucher {
  id: string;
  voucherNumber: string | null;
  date: string;
  type: 'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'CONTRA';
  remarks: string | null;
  lines: ApiVoucherLine[];
}

export function VoucherForm({
  accounts,
  initialVouchers,
}: {
  accounts: Account[];
  initialVouchers: Voucher[];
}) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [type, setType] = useState<'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'CONTRA'>('PAYMENT');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  // Dynamic lines state (default to 2 rows)
  const [lines, setLines] = useState<VoucherLineItem[]>([
    { id: '1', accountId: accounts[0]?.id || '', amount: '', isDebit: true },
    { id: '2', accountId: accounts[1]?.id || accounts[0]?.id || '', amount: '', isDebit: false },
  ]);

  // Live calculations
  const { totalDebit, totalCredit, difference, isBalanced } = useMemo(() => {
    let debitSum = 0;
    let creditSum = 0;
    let allFilled = lines.length >= 2;

    for (const line of lines) {
      const val = parseFloat(line.amount) || 0;
      if (val <= 0 || !line.accountId) {
        allFilled = false;
      }
      if (line.isDebit) {
        debitSum += val;
      } else {
        creditSum += val;
      }
    }

    const diff = Number((creditSum - debitSum).toFixed(2));
    const balanced = allFilled && Math.abs(diff) < 0.001 && debitSum > 0 && creditSum > 0;

    return {
      totalDebit: Number(debitSum.toFixed(2)),
      totalCredit: Number(creditSum.toFixed(2)),
      difference: diff,
      isBalanced: balanced,
    };
  }, [lines]);

  const handleLineChange = (id: string, field: 'accountId' | 'amount' | 'isDebit', value: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        return { ...line, [field]: value };
      })
    );
  };

  const handleAddLine = () => {
    const nextId = String(Date.now());
    // If there's an imbalance, suggest the balancing side
    const suggestDebit = difference > 0; // Credits are higher, so we need more Debits
    const suggestAmount = Math.abs(difference) > 0 ? String(Math.abs(difference)) : '';

    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        accountId: accounts[0]?.id || '',
        amount: suggestAmount,
        isDebit: suggestDebit,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) {
      toast.error('A voucher must have at least 2 lines for double-entry.');
      return;
    }
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleAutoBalance = () => {
    if (Math.abs(difference) < 0.001) {
      toast.info('Voucher is already balanced!');
      return;
    }

    const absDiff = Math.abs(difference);
    const needDebit = difference > 0; // more Credits than Debits -> need Dr

    // Check if the last line is empty
    const lastLine = lines[lines.length - 1];
    if (!lastLine.amount || parseFloat(lastLine.amount) === 0) {
      setLines((prev) =>
        prev.map((line, idx) =>
          idx === prev.length - 1
            ? { ...line, amount: String(absDiff), isDebit: needDebit }
            : line
        )
      );
    } else {
      // Add a new balancing line
      setLines((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          accountId: accounts[0]?.id || '',
          amount: String(absDiff),
          isDebit: needDebit,
        },
      ]);
    }
    toast.success(`Balanced with ₹${absDiff.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${needDebit ? 'Debit' : 'Credit'}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced) {
      toast.error(`Voucher is unbalanced. Debits (₹${totalDebit}) and Credits (₹${totalCredit}) must match.`);
      return;
    }

    // Build payload lines with signed amounts (negative for Debit, positive for Credit)
    const payloadLines = lines.map((line) => {
      const val = parseFloat(line.amount);
      const signedAmount = line.isDebit ? -val : val;
      return {
        accountId: line.accountId,
        amount: Number(signedAmount.toFixed(2)),
      };
    });

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          date,
          remarks: remarks.trim() || null,
          lines: payloadLines,
        }),
      });

      if (res.ok) {
        const newVoucher = await res.json();
        setVouchers((prev) => [newVoucher, ...prev]);
        toast.success('Voucher saved and posted to ledger successfully');

        // Reset form
        setRemarks('');
        setLines([
          { id: '1', accountId: accounts[0]?.id || '', amount: '', isDebit: true },
          { id: '2', accountId: accounts[1]?.id || accounts[0]?.id || '', amount: '', isDebit: false },
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save voucher');
      }
    } catch {
      toast.error('Failed to connect to the backend server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher entry? It will also be removed from the ledger.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vouchers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVouchers((prev) => prev.filter((v) => v.id !== id));
        toast.success('Voucher entry and ledger postings deleted');
      } else {
        toast.error('Failed to delete voucher');
      }
    } catch {
      toast.error('Failed to delete voucher');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display flex items-center gap-2">
            <Scale className="w-8 h-8 text-[var(--color-primary)]" />
            Voucher Entry
          </h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Record multi-line payments, receipts, contra, or journal vouchers with real-time double-entry balancing and ledger integration.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Voucher Form Panel */}
        <div className="card shadow-md border border-[var(--color-border-light)] bg-white p-6">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--color-border-light)]">
            <h3 className="text-lg font-bold text-[var(--color-charcoal)]">
              Create New Voucher
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAutoBalance}
                disabled={Math.abs(difference) < 0.001 || saving}
                className="btn btn--secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Balance ({difference > 0 ? `+₹${Math.abs(difference)} Dr` : `-₹${Math.abs(difference)} Cr`})</span>
              </button>
              <button
                type="button"
                onClick={handleAddLine}
                disabled={saving}
                className="btn btn--secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Header Fields in 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Voucher Type */}
              <div className="form-field">
                <label className="form-label form-label--required">Voucher Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="input w-full"
                  disabled={saving}
                >
                  <option value="PAYMENT">Payment</option>
                  <option value="RECEIPT">Receipt</option>
                  <option value="JOURNAL">Journal</option>
                  <option value="CONTRA">Contra</option>
                </select>
              </div>

              {/* Date */}
              <div className="form-field">
                <label className="form-label form-label--required">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input pl-10 w-full"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="form-field">
                <label className="form-label">Remarks / Narration</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter transaction narrative..."
                    className="input pl-10 w-full"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Voucher Lines Table */}
            <div className="border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                <span>Voucher Lines (Double-Entry Rows)</span>
                <span>{lines.length} Rows</span>
              </div>

              <div className="p-4 space-y-3 bg-white">
                {lines.map((line, index) => {
                  const val = parseFloat(line.amount) || 0;
                  return (
                    <div
                      key={line.id}
                      className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                    >
                      {/* Row Index & Type Badge */}
                      <div className="col-span-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>

                      {/* Account Selector */}
                      <div className="col-span-5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Account Master
                        </label>
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(line.id, 'accountId', e.target.value)}
                          className="input text-xs py-1.5 w-full bg-white"
                          disabled={saving}
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name} ({acc.group?.name || 'No Group'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dr / Cr Toggle */}
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Entry Side
                        </label>
                        <div className="flex rounded-md shadow-sm border border-slate-200 overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleLineChange(line.id, 'isDebit', true)}
                            className={cn(
                              "flex-1 py-1 text-xs font-bold transition-colors",
                              line.isDebit
                                ? "bg-red-500 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            Dr
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLineChange(line.id, 'isDebit', false)}
                            className={cn(
                              "flex-1 py-1 text-xs font-bold transition-colors",
                              !line.isDebit
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            Cr
                          </button>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Amount (₹)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={line.amount}
                            onChange={(e) => handleLineChange(line.id, 'amount', e.target.value)}
                            className={cn(
                              "input text-xs py-1.5 font-mono w-full bg-white font-bold",
                              line.isDebit ? "text-red-700" : "text-emerald-700"
                            )}
                            required
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {/* Delete Action */}
                      <div className="col-span-1 flex justify-end items-end pt-5">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          disabled={lines.length <= 2 || saving}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-20 transition-colors rounded hover:bg-red-50"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Totals & Balance Bar */}
              <div className="bg-slate-100/80 px-6 py-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase">Total Debits (Dr)</span>
                    <span className="text-base font-mono font-bold text-red-700">
                      ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-slate-300 text-lg">|</div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase">Total Credits (Cr)</span>
                    <span className="text-base font-mono font-bold text-emerald-700">
                      ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-slate-300 text-lg">|</div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase">Difference</span>
                    <span
                      className={cn(
                        "text-base font-mono font-bold",
                        Math.abs(difference) < 0.001 ? "text-emerald-700" : "text-amber-700"
                      )}
                    >
                      {Math.abs(difference) < 0.001
                        ? '₹0.00 (Balanced)'
                        : `₹${Math.abs(difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${difference > 0 ? 'Need Dr' : 'Need Cr'})`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isBalanced ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/60 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Ready to Submit</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/60 px-3 py-1.5 rounded-lg border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Unbalanced</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !isBalanced}
                    className="btn btn--primary py-2 px-6 font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Posting...' : 'Save & Post Voucher'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Voucher History Panel */}
        <div className="card shadow-md border border-[var(--color-border-light)] bg-white p-0">
          <div className="p-6 border-b border-[var(--color-border-light)] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Voucher History</h3>
            <span className="text-xs text-slate-400 font-semibold">{vouchers.length} Vouchers Recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '100px' }}>Type</th>
                  <th>Debits (Dr)</th>
                  <th>Credits (Cr)</th>
                  <th>Narration / Remarks</th>
                  <th style={{ width: '80px' }} className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--color-slate)] font-medium">
                      No voucher entries found. Create one using the form above.
                    </td>
                  </tr>
                ) : null}
                {vouchers.map((v) => {
                  const debits = v.lines.filter((l) => l.amount < 0);
                  const credits = v.lines.filter((l) => l.amount > 0);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="text-xs font-semibold text-[var(--color-charcoal)]">
                        {new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "badge text-[10px] font-bold uppercase",
                            v.type === 'PAYMENT' && "badge--warning",
                            v.type === 'RECEIPT' && "badge--success",
                            v.type === 'JOURNAL' && "badge--neutral",
                            v.type === 'CONTRA' && "badge--secondary"
                          )}
                        >
                          {v.type}
                        </span>
                      </td>
                      <td className="py-3 text-xs">
                        <div className="space-y-1.5">
                          {debits.map((d, i) => (
                            <div key={i} className="flex items-baseline gap-2">
                              <span className="font-semibold text-slate-800">{d.account?.name}</span>
                              <span className="font-mono text-red-600 font-bold">
                                ₹{Math.abs(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">({d.account?.code})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-xs">
                        <div className="space-y-1.5">
                          {credits.map((c, i) => (
                            <div key={i} className="flex items-baseline gap-2">
                              <span className="font-semibold text-slate-800">{c.account?.name}</span>
                              <span className="font-mono text-emerald-700 font-bold">
                                ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">({c.account?.code})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs text-[var(--color-slate)] max-w-[240px] truncate" title={v.remarks || ''}>
                        {v.remarks || '—'}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50"
                          title="Delete Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
