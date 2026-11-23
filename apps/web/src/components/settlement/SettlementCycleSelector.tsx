'use client';

import { Layers, RefreshCw } from 'lucide-react';
import type { SettlementRecord } from './types';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

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
  const formatDateStr = (dateStr: string) => formatDateToDDMMYY(dateStr);

  const cycleOptions = [
    { value: 'LIVE', label: 'Live / Open Positions (Unsettled Trades)' },
    ...settlementsList.map((s) => ({
      value: s.id,
      label: `${s.name} (${formatDateStr(s.fromDate)} – ${formatDateStr(s.toDate)})`,
      sublabel: `${s._count?.trades || 0} trades recorded`,
    })),
  ];

  return (
    <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2652C8] flex items-center justify-center shadow-2xs">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Settlement Period / Batch
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 font-display mt-0.5">
            Select Settlement Cycle
          </h2>
          <p className="text-xs text-slate-500">
            Review active live positions or browse finalized historical settlement cycles.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="w-72 max-w-full">
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
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh settlement summary and records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
