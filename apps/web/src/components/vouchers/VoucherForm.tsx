'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, AlertCircle, CheckCircle, Scale, Calendar, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Account {
  id: string;
  code: string;
  name: string;
  group?: {
    name: string;
  };
}

interface VoucherLine {
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
  lines: VoucherLine[];
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
  
  // Row 1 & 2 states
  const [line1, setLine1] = useState({ accountId: accounts[0]?.id || '', amount: '' });
  const [line2, setLine2] = useState({ accountId: accounts[1]?.id || accounts[0]?.id || '', amount: '' });
  const [saving, setSaving] = useState(false);

  // Auto-balance checkbox helper
  const [autoBalance, setAutoBalance] = useState(true);

  // Amount parsing helper
  const val1 = Number(line1.amount) || 0;
  const val2 = Number(line2.amount) || 0;
  const totalDifference = val1 + val2;
  const isBalanced = val1 !== 0 && val2 !== 0 && totalDifference === 0;

  const handleLine1AmountChange = (val: string) => {
    setLine1(prev => ({ ...prev, amount: val }));
    if (autoBalance && val) {
      const num = Number(val);
      if (!isNaN(num)) {
        setLine2(prev => ({ ...prev, amount: String(-num) }));
      }
    }
  };

  const handleLine2AmountChange = (val: string) => {
    setLine2(prev => ({ ...prev, amount: val }));
    if (autoBalance && val) {
      const num = Number(val);
      if (!isNaN(num)) {
        setLine1(prev => ({ ...prev, amount: String(-num) }));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.accountId || !line2.accountId) {
      toast.error('Please select accounts for both rows');
      return;
    }
    if (line1.accountId === line2.accountId) {
      toast.error('Both accounts cannot be the same');
      return;
    }
    if (!val1 || !val2) {
      toast.error('Amounts must be non-zero');
      return;
    }
    if (!isBalanced) {
      toast.error(`Voucher is unbalanced. Sum of lines must be zero. (Sum: ${totalDifference})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          date,
          remarks: remarks.trim() || null,
          lines: [
            { accountId: line1.accountId, amount: val1 },
            { accountId: line2.accountId, amount: val2 }
          ]
        })
      });

      if (res.ok) {
        const newVoucher = await res.json();
        setVouchers(prev => [newVoucher, ...prev]);
        toast.success('Voucher saved successfully');
        
        // Reset form
        setRemarks('');
        setLine1(prev => ({ ...prev, amount: '' }));
        setLine2(prev => ({ ...prev, amount: '' }));
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
    if (!confirm('Are you sure you want to delete this voucher entry?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vouchers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setVouchers(prev => prev.filter(v => v.id !== id));
        toast.success('Voucher entry deleted');
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
            Record payments, receipts, contra, or journal adjustments with double-entry validation.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Voucher Form Panel */}
        <div className="card shadow-md border border-[var(--color-border-light)] bg-white p-6">
          <h3 className="text-lg font-bold text-[var(--color-charcoal)] mb-6 flex items-center gap-2 pb-3 border-b border-[var(--color-border-light)]">
            Create New Voucher
          </h3>
          
          <form onSubmit={handleSave} className="space-y-6">
            {/* Header Fields in 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Voucher Type */}
              <div className="form-field">
                <label className="form-label form-label--required">Voucher Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
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
                    onChange={e => setDate(e.target.value)}
                    className="input pl-10 w-full"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="form-field">
                <label className="form-label">Remarks / Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter transaction narrative..."
                    className="input pl-10 w-full"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {/* Auto Balance Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-slate)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBalance}
                  onChange={e => setAutoBalance(e.target.checked)}
                  className="rounded text-[var(--color-emerald)] focus:ring-[var(--color-emerald)]"
                />
                Auto-balance lines (inverted amounts)
              </label>
            </div>

            {/* Lines in 2-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1 */}
              <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line 1</span>
                  {val1 !== 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      val1 < 0 ? "bg-red-50 text-[var(--color-negative)] border border-red-200/50" : "bg-emerald-50 text-[var(--color-forest)] border border-emerald-200/50"
                    )}>
                      {val1 < 0 ? 'Debit (Dr)' : 'Credit (Cr)'}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Account</label>
                  <select
                    value={line1.accountId}
                    onChange={e => setLine1(prev => ({ ...prev, accountId: e.target.value }))}
                    className="input text-sm py-1 w-full"
                    disabled={saving}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.group?.name || 'No Group'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Amount (negative for Debit)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    value={line1.amount}
                    onChange={e => handleLine1AmountChange(e.target.value)}
                    className="input text-sm py-1 font-mono w-full"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line 2</span>
                  {val2 !== 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      val2 < 0 ? "bg-red-50 text-[var(--color-negative)] border border-red-200/50" : "bg-emerald-50 text-[var(--color-forest)] border border-emerald-200/50"
                    )}>
                      {val2 < 0 ? 'Debit (Dr)' : 'Credit (Cr)'}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Account</label>
                  <select
                    value={line2.accountId}
                    onChange={e => setLine2(prev => ({ ...prev, accountId: e.target.value }))}
                    className="input text-sm py-1 w-full"
                    disabled={saving}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.group?.name || 'No Group'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Amount (negative for Debit)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    value={line2.amount}
                    onChange={e => handleLine2AmountChange(e.target.value)}
                    className="input text-sm py-1 font-mono w-full"
                    required
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Bar: Warning banner & Save button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div className="flex-1">
                {val1 !== 0 && val2 !== 0 && (
                  <div className={cn(
                    "p-3 rounded-xl flex items-start gap-2.5 text-xs border max-w-xl",
                    isBalanced
                      ? "bg-emerald-50 border-emerald-200/50 text-emerald-800"
                      : "bg-red-50 border-red-200/50 text-red-800"
                  )}>
                    {isBalanced ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      {isBalanced ? (
                        <span className="font-semibold">Balanced! Ready to save.</span>
                      ) : (
                        <div>
                          <span className="font-semibold">Unbalanced:</span> Sum of lines must be zero. Off by: <span className="font-bold font-mono">{totalDifference > 0 ? '+' : ''}{totalDifference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || !isBalanced}
                className="btn btn--primary py-2.5 px-8 font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {saving ? 'Saving...' : 'Save Voucher'}
              </button>
            </div>
          </form>
        </div>

        {/* Voucher History Panel */}
        <div className="card shadow-md border border-[var(--color-border-light)] bg-white p-0">
          <div className="p-6 border-b border-[var(--color-border-light)]">
            <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Recent Voucher Entries</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Debit (Line 1)</th>
                  <th>Credit (Line 2)</th>
                  <th>Remarks</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--color-slate)] font-medium">
                      No voucher entries found. Create one using the form.
                    </td>
                  </tr>
                ) : null}
                {vouchers.map(v => {
                  const sortedLines = [...v.lines].sort((a, b) => a.amount - b.amount); // Debit (negative) first
                  const lineDr = sortedLines[0]; // negative
                  const lineCr = sortedLines[1]; // positive

                  return (
                    <tr key={v.id}>
                      <td className="text-xs font-semibold text-[var(--color-charcoal)]">
                        {new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className={cn(
                          "badge text-[10px] font-bold uppercase",
                          v.type === 'PAYMENT' && "badge--warning",
                          v.type === 'RECEIPT' && "badge--success",
                          v.type === 'JOURNAL' && "badge--neutral",
                          v.type === 'CONTRA' && "badge--secondary"
                        )}>
                          {v.type}
                        </span>
                      </td>
                      <td className="py-3 text-xs">
                        {lineDr && (
                          <div className="flex flex-col gap-1 leading-normal">
                            <div className="font-semibold text-[var(--color-charcoal)] leading-snug">{lineDr.account?.name}</div>
                            <div className="font-mono text-[var(--color-negative)] font-semibold leading-none">
                              -₹{Math.abs(lineDr.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-[var(--color-slate)] font-mono leading-none">{lineDr.account?.code}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        {lineCr && (
                          <div className="flex flex-col gap-1 leading-normal">
                            <div className="font-semibold text-[var(--color-charcoal)] leading-snug">{lineCr.account?.name}</div>
                            <div className="font-mono text-[var(--color-forest)] font-semibold leading-none">
                              +₹{lineCr.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-[var(--color-slate)] font-mono leading-none">{lineCr.account?.code}</div>
                          </div>
                        )}
                      </td>
                      <td className="text-xs text-[var(--color-slate)] max-w-[200px] truncate" title={v.remarks || ''}>
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
