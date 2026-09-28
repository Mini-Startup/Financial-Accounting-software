'use client';

import { Layers, RefreshCw } from 'lucide-react';
import type { SettlementRecord } from './types';
import { UniversalDropdown } from '../ui/UniversalDropdown';

interface SettlementCycleSelectorProps {
  selectedSettlementId: string;
  settlementsList: SettlementRecord[];
  onSelectCycle: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function SettlementCycleSelector({
  selectedSettlementId,
  settlementsList,
  onSelectCycle,
  onRefresh,
  isLoading,
}: SettlementCycleSelectorProps) {
  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const cycleOptions = [
    { value: 'LIVE', label: '⚡ Live / Open Positions (Unsettled Trades)' },
    ...settlementsList.map((s) => ({
      value: s.id,
      label: `📁 ${s.name} (${formatDateStr(s.fromDate)} – ${formatDateStr(s.toDate)})`,
      sublabel: `${s._count?.trades || 0} trades recorded`,
    })),
  ];

  return (
    <div className="card bg-white p-5 rounded-2xl shadow-xs border border-[var(--color-border-light)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[var(--color-mist)] text-[var(--color-forest)] rounded-lg">
              <Layers className="w-4 h-4 text-[var(--color-forest)]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-forest)]">
              Settlement Period / Batch
            </span>
          </div>
          <h2 className="text-base font-bold text-[var(--color-charcoal)] font-display">
            Select Settlement Cycle
          </h2>
          <p className="text-xs text-[var(--color-slate)]">
            Review active live positions or browse finalized historical settlement cycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-[280px]">
            <UniversalDropdown
              value={selectedSettlementId}
              options={cycleOptions}
              onChange={(val) => onSelectCycle(val)}
              placeholder="Select Settlement Cycle"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="btn btn--secondary text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
            title="Refresh settlement summary and records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--color-leaf)]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
