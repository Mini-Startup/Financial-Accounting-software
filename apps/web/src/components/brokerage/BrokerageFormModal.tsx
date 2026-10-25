'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, Calculator, Building2, User, Layers, ArrowRight } from 'lucide-react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useScrollLock } from '../../hooks/useScrollLock';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { AllScriptsBrokerageTable, type ScriptRuleRow } from './AllScriptsBrokerageTable';
import { round } from '@/utils/brokerage';
import { cn } from '@/utils/cn';

interface BrokerageFormModalProps {
  accounts: any[];
  scripts: any[];
  onClose: () => void;
  initialRule?: any;
}

export function BrokerageFormModal({
  accounts,
  scripts,
  onClose,
  initialRule,
}: BrokerageFormModalProps) {
  useScrollLock(true);
  const router = useRouter();
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Controls
  const [appliesTo, setAppliesTo] = useState<'CLIENT' | 'BROKER'>(
    initialRule?.appliesTo || 'CLIENT'
  );
  const [accountId, setAccountId] = useState<string>(initialRule?.accountId || '');
  const [scope, setScope] = useState<'SINGLE' | 'ALL'>(
    initialRule?.scriptId ? 'SINGLE' : 'SINGLE'
  );

  // Single script state
  const [scriptId, setScriptId] = useState<string>(initialRule?.scriptId || '');
  const [direction, setDirection] = useState<'BOTH' | 'BUY' | 'SELL'>(
    initialRule?.direction || 'BOTH'
  );
  const [quantity, setQuantity] = useState<string>(
    initialRule?.quantity != null ? String(initialRule.quantity) : '1'
  );
  const [brokerage, setBrokerage] = useState<string>(
    initialRule?.brokerage != null ? String(initialRule.brokerage) : ''
  );

  // All scripts state: table of all scripts
  const [scriptRows, setScriptRows] = useState<ScriptRuleRow[]>(() => {
    return (scripts || []).map((s) => ({
      scriptId: s.id,
      shortName: s.shortName || s.symbol || s.name || 'Unnamed',
      fullName: s.fullName || s.name || '',
      exchangeCode: s.exchange?.code || s.exchangeCode || '—',
      marketLot: s.lotSize && s.lotSize > 0 ? s.lotSize : 1, // READ ONLY
      mode: 'BOTH',
      bothQuantity: '1', // default 1, NOT market lot!
      bothBrokerage: '',
      buyActive: true,
      buyQuantity: '1',
      buyBrokerage: '',
      sellActive: true,
      sellQuantity: '1',
      sellBrokerage: '',
    }));
  });

  // Filter accounts based on appliesTo
  const filteredAccounts = useMemo(() => {
    const groupMatcher = appliesTo === 'CLIENT' ? 'Sundry Debtors' : 'Sundry Creditors';
    const matched = accounts.filter(
      (acc) =>
        acc.group?.name === groupMatcher ||
        acc.group?.fldGroupName === groupMatcher ||
        (appliesTo === 'CLIENT' ? acc.isDirectClient !== false : false)
    );
    return matched.length > 0 ? matched : accounts;
  }, [accounts, appliesTo]);

  // Selected script object for Single Script mode
  const selectedScript = useMemo(() => {
    if (!scriptId) return null;
    return scripts.find((s) => s.id === scriptId) || null;
  }, [scripts, scriptId]);

  // Script change handler in Single Script mode (DO NOT prefill quantity with marketLot!)
  const handleScriptChange = (selectedId: string) => {
    setScriptId(selectedId);
  };

  // Live single-script per unit calculation
  const singlePerUnit = useMemo(() => {
    const q = parseFloat(quantity);
    const b = parseFloat(brokerage);
    if (!isNaN(q) && q > 0 && !isNaN(b) && b >= 0) {
      return round(b / q, 4).toFixed(4);
    }
    return null;
  }, [quantity, brokerage]);

  // Handle row updates in All Scripts table
  const handleRowChange = (updatedRow: ScriptRuleRow) => {
    setScriptRows((prev) =>
      prev.map((r) => (r.scriptId === updatedRow.scriptId ? updatedRow : r))
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      toast.error(`Please select a ${appliesTo.toLowerCase()} account`);
      return;
    }

    setIsSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
      if (scope === 'SINGLE') {
        if (!scriptId) {
          toast.error('Please select a script');
          setIsSubmitting(false);
          return;
        }

        const qNum = parseFloat(quantity);
        if (isNaN(qNum) || qNum <= 0) {
          toast.error('Quantity must be greater than 0');
          setIsSubmitting(false);
          return;
        }

        const bNum = parseFloat(brokerage);
        if (isNaN(bNum) || bNum < 0) {
          toast.error('Brokerage must be a non-negative number');
          setIsSubmitting(false);
          return;
        }

        const payload = {
          accountId,
          appliesTo,
          scope: 'SCRIPT',
          scriptId,
          direction,
          quantity: qNum,
          brokerage: bNum,
        };

        const url = initialRule?.id
          ? `${apiUrl}/brokerages/${initialRule.id}`
          : `${apiUrl}/brokerages`;
        const method = initialRule?.id ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to save brokerage rule');
        }

        toast.success(
          initialRule?.id
            ? 'Brokerage rule updated successfully'
            : 'Brokerage rule added successfully'
        );
        router.refresh();

        if (initialRule?.id) {
          onClose();
        } else {
          setBrokerage('');
          setScriptId('');
        }
      } else {
        // ALL SCRIPTS BATCH SUBMIT (Supports BOTH, BUY, and SELL independently)
        const activeRules: any[] = [];

        for (const row of scriptRows) {
          if (row.mode === 'BOTH') {
            const b = parseFloat(String(row.bothBrokerage || '0'));
            const q = parseFloat(String(row.bothQuantity || '1'));
            if (!isNaN(b) && b > 0 && !isNaN(q) && q > 0) {
              activeRules.push({
                accountId,
                appliesTo,
                scope: 'SCRIPT',
                scriptId: row.scriptId,
                direction: 'BOTH',
                quantity: q,
                brokerage: b,
              });
            }
          } else {
            // Split mode
            if (row.buyActive) {
              const b = parseFloat(String(row.buyBrokerage || '0'));
              const q = parseFloat(String(row.buyQuantity || '1'));
              if (!isNaN(b) && b > 0 && !isNaN(q) && q > 0) {
                activeRules.push({
                  accountId,
                  appliesTo,
                  scope: 'SCRIPT',
                  scriptId: row.scriptId,
                  direction: 'BUY',
                  quantity: q,
                  brokerage: b,
                });
              }
            }
            if (row.sellActive) {
              const b = parseFloat(String(row.sellBrokerage || '0'));
              const q = parseFloat(String(row.sellQuantity || '1'));
              if (!isNaN(b) && b > 0 && !isNaN(q) && q > 0) {
                activeRules.push({
                  accountId,
                  appliesTo,
                  scope: 'SCRIPT',
                  scriptId: row.scriptId,
                  direction: 'SELL',
                  quantity: q,
                  brokerage: b,
                });
              }
            }
          }
        }

        if (activeRules.length === 0) {
          toast.error('Please enter brokerage for at least one script before saving');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(`${apiUrl}/brokerages/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules: activeRules }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to save script brokerage rules');
        }

        const result = await res.json();
        toast.success(
          `Successfully saved brokerage rules for ${result.count || activeRules.length} scripts!`
        );
        router.refresh();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rules');
    } finally {
      setIsSubmitting(false);
    }
  };

  const configuredAllCount = useMemo(() => {
    return scriptRows.filter((r) => {
      if (r.mode === 'BOTH') {
        const b = parseFloat(String(r.bothBrokerage || '0'));
        return !isNaN(b) && b > 0;
      }
      const bBuy = r.buyActive ? parseFloat(String(r.buyBrokerage || '0')) : 0;
      const bSell = r.sellActive ? parseFloat(String(r.sellBrokerage || '0')) : 0;
      return (!isNaN(bBuy) && bBuy > 0) || (!isNaN(bSell) && bSell > 0);
    }).length;
  }, [scriptRows]);

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className={cn(
          'card flex flex-col p-0 overflow-hidden shadow-2xl border-none animate-in zoom-in-95 duration-150 transition-all',
          scope === 'ALL'
            ? 'w-[1140px] max-w-[96vw] h-[88vh] max-h-[88vh]'
            : 'w-[520px] max-w-[95vw]'
        )}
      >
        {/* Header (Aligned with Brand Style Guide) */}
        <div className="card__header bg-[var(--color-snow)] flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100/70 text-emerald-800 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="card__title text-base font-bold text-[var(--color-charcoal)]">
                {initialRule?.id ? 'Edit Brokerage Rule' : 'Configure Brokerage Rules'}
              </h2>
              <p className="text-xs text-[var(--color-slate)] mt-0.5">
                Set quantity-based brokerage rate formulas for clients or brokers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: overflow-hidden in ALL mode so popup NEVER has a scrollbar */}
        <div
          className={cn(
            'card__body p-5 flex-1 flex flex-col min-h-0',
            scope === 'ALL' ? 'overflow-hidden' : 'overflow-y-auto space-y-4'
          )}
        >
          {/* Top Configuration Controls */}
          <div className="space-y-4 shrink-0 bg-[var(--color-snow)] p-4 rounded-xl border border-[var(--color-border-light)]">
            {/* Row 1: Applies To & Select Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Applies To */}
              <div className="form-field">
                <label className="form-label form-label--required">Applies To</label>
                <div className="inline-flex p-1 bg-white rounded-lg border border-[var(--color-border-light)] gap-1 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAppliesTo('CLIENT');
                      setAccountId('');
                    }}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none',
                      appliesTo === 'CLIENT'
                        ? 'bg-[var(--color-forest)] text-white shadow-xs'
                        : 'text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)]/30'
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliesTo('BROKER');
                      setAccountId('');
                    }}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none',
                      appliesTo === 'BROKER'
                        ? 'bg-[var(--color-forest)] text-white shadow-xs'
                        : 'text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)]/30'
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Broker</span>
                  </button>
                </div>
              </div>

              {/* 2. Select Account */}
              <div className="form-field">
                <label className="form-label form-label--required">
                  {appliesTo === 'CLIENT' ? 'Select Client' : 'Select Broker'}
                </label>
                <UniversalDropdown
                  value={accountId}
                  options={filteredAccounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name || acc.fldName || 'Unnamed'} (${acc.code || acc.fldClient || acc.id.substring(0, 6)})`,
                    sublabel: acc.group?.name || acc.group?.fldGroupName,
                  }))}
                  onChange={(val) => setAccountId(val)}
                  placeholder={appliesTo === 'CLIENT' ? 'Choose Client Account...' : 'Choose Broker Account...'}
                />
              </div>
            </div>

            {/* Row 2: Script Mode (under the other two options, text wrap = none) */}
            <div className="form-field">
              <label className="form-label form-label--required">Script Mode</label>
              <div className="inline-flex p-1 bg-white rounded-lg border border-[var(--color-border-light)] gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setScope('SINGLE')}
                  className={cn(
                    'flex-1 py-1.5 px-4 rounded-md text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap select-none',
                    scope === 'SINGLE'
                      ? 'bg-[var(--color-forest)] text-white shadow-xs'
                      : 'text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)]/30'
                  )}
                >
                  <span className="whitespace-nowrap">Single Script</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('ALL')}
                  className={cn(
                    'flex-1 py-1.5 px-4 rounded-md text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 whitespace-nowrap select-none',
                    scope === 'ALL'
                      ? 'bg-[var(--color-forest)] text-white shadow-xs'
                      : 'text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)]/30'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">All Scripts</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conditional View: Single Script vs All Scripts */}
          {scope === 'SINGLE' ? (
            <div className="space-y-4">
              {/* Script Selection */}
              <div className="form-field">
                <label className="form-label form-label--required">Select Script</label>
                <UniversalDropdown
                  value={scriptId}
                  options={scripts.map((s) => ({
                    value: s.id,
                    label: `${s.shortName || s.name} - ${s.fullName || ''}`,
                    sublabel: s.exchange?.code ? `Exchange: ${s.exchange.code}` : undefined,
                  }))}
                  onChange={handleScriptChange}
                  placeholder="Search and choose script..."
                />
              </div>

              {/* Script Badges & Market Lot info */}
              {selectedScript && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--color-snow)] rounded-xl border border-[var(--color-border-light)]">
                  <div>
                    <div className="text-[11px] font-semibold text-[var(--color-slate)]">Exchange</div>
                    <div className="text-sm font-bold text-[var(--color-charcoal)] mt-0.5">
                      {selectedScript.exchange?.code || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[var(--color-slate)]">Market Lot (Read-Only)</div>
                    <div className="text-sm font-bold font-mono text-[var(--color-charcoal)] mt-0.5">
                      {selectedScript.lotSize || 1}
                    </div>
                  </div>
                </div>
              )}

              {/* Direction, Quantity, Brokerage Inputs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Direction</label>
                  <UniversalDropdown
                    value={direction}
                    options={[
                      { value: 'BOTH', label: 'Both' },
                      { value: 'BUY', label: 'Buy' },
                      { value: 'SELL', label: 'Sell' },
                    ]}
                    onChange={(val) => setDirection(val as 'BOTH' | 'BUY' | 'SELL')}
                    searchable={false}
                    placeholder="Select Direction"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Rule Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    className="input text-xs font-mono font-bold text-right py-2.5"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Brokerage (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={brokerage}
                    onChange={(e) => setBrokerage(e.target.value)}
                    placeholder="e.g. 10.00"
                    className="input text-xs font-mono font-bold text-right py-2.5"
                  />
                </div>
              </div>

              {/* Live Per-Quantity Rate Display */}
              {singlePerUnit && (
                <div className="p-4 bg-[var(--color-mist)]/50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-emerald-900">Per-Quantity Rate:</span>
                    <span className="text-xs text-emerald-800 font-mono">
                      (₹{brokerage} ÷ {quantity} quantity)
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-[var(--color-forest)]">
                    ₹{singlePerUnit} / quantity
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* All Scripts Table View */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <AllScriptsBrokerageTable
                rows={scriptRows}
                onRowChange={handleRowChange}
              />
            </div>
          )}
        </div>

        {/* Footer (Aligned with Brand Style Guide) */}
        <div className="p-4 border-t border-[var(--color-border-light)] bg-[var(--color-snow)] flex items-center justify-between shrink-0">
          <div className="text-xs text-[var(--color-slate)]">
            {scope === 'ALL' ? (
              <span>
                <strong>{configuredAllCount}</strong> of {scriptRows.length} scripts will be saved individually
              </span>
            ) : (
              <span>Individual script rule will be configured for selected account</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn--secondary text-xs py-2 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !accountId}
              className={cn(
                'btn btn--primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-xs cursor-pointer',
                (!accountId || isSubmitting) && 'opacity-60 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : scope === 'ALL' ? (
                <>
                  <span>Save All Script Rules ({configuredAllCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : initialRule?.id ? (
                'Update Brokerage Rule'
              ) : (
                'Add Brokerage Rule'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
