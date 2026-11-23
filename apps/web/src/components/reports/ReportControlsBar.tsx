'use client';

import React from 'react';
import { Filter, RotateCcw, Search, User, Briefcase, FileCode } from 'lucide-react';
import { UniversalDropdown, DropdownOption } from '@/components/ui/UniversalDropdown';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import { cn } from '@/utils/cn';

export interface ReportControlsBarProps {
  // Dimension Toggle (Net Position)
  groupBy?: 'CLIENT' | 'BROKER' | 'SCRIPT';
  onGroupByChange?: (dimension: 'CLIENT' | 'BROKER' | 'SCRIPT') => void;

  // Settlement Selection (Audit & Summary)
  settlementId?: string;
  onSettlementChange?: (settlementId: string) => void;
  settlementOptions?: DropdownOption[];

  // Date Pickers
  asOfDate?: string;
  onAsOfDateChange?: (date: string) => void;
  fromDate?: string;
  onFromDateChange?: (date: string) => void;
  toDate?: string;
  onToDateChange?: (date: string) => void;

  // Trade Type Filter (Audit)
  tradeType?: string;
  onTradeTypeChange?: (tradeType: string) => void;

  // Counterparty & Instrument Dropdowns
  clientId?: string;
  onClientChange?: (clientId: string) => void;
  clientOptions?: DropdownOption[];

  brokerId?: string;
  onBrokerChange?: (brokerId: string) => void;
  brokerOptions?: DropdownOption[];

  scriptId?: string;
  onScriptChange?: (scriptId: string) => void;
  scriptOptions?: DropdownOption[];

  // Search Filter
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;

  // Reset
  onResetFilters?: () => void;
}

export function ReportControlsBar({
  groupBy,
  onGroupByChange,
  settlementId,
  onSettlementChange,
  settlementOptions,
  asOfDate,
  onAsOfDateChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  tradeType,
  onTradeTypeChange,
  clientId,
  onClientChange,
  clientOptions,
  brokerId,
  onBrokerChange,
  brokerOptions,
  scriptId,
  onScriptChange,
  scriptOptions,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  onResetFilters,
}: ReportControlsBarProps) {
  return (
    <div className="print:hidden bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ─── GROUP BY DIMENSION TOGGLE ────────────────────────────────────── */}
        {groupBy && onGroupByChange && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Group By:
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50/80 shadow-2xs">
              <button
                type="button"
                onClick={() => onGroupByChange('CLIENT')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  groupBy === 'CLIENT'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span>Client</span>
              </button>
              <button
                type="button"
                onClick={() => onGroupByChange('BROKER')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  groupBy === 'BROKER'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Broker</span>
              </button>
              <button
                type="button"
                onClick={() => onGroupByChange('SCRIPT')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  groupBy === 'SCRIPT'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Script</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── SETTLEMENT CYCLE SELECTOR ─────────────────────────────────────── */}
        {settlementOptions && onSettlementChange && (
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Settlement:
            </span>
            <div className="w-64">
              <UniversalDropdown
                value={settlementId || ''}
                options={settlementOptions}
                onChange={onSettlementChange}
                placeholder="Select Settlement Cycle"
              />
            </div>
          </div>
        )}

        {/* ─── SEARCH INPUT ─────────────────────────────────────────────────── */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-[#2652C8] transition-all"
            />
          </div>
        )}

        {/* ─── RESET FILTERS BUTTON ─────────────────────────────────────────── */}
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer ml-auto shadow-2xs"
            title="Reset Filters to Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ─── SECONDARY ROW: DATE PICKERS & DROPDOWN FILTERS ─────────────────── */}
      <div className="flex flex-wrap items-center gap-3.5 pt-3 border-t border-slate-100 text-xs">
        {/* As Of Date Picker */}
        {asOfDate !== undefined && onAsOfDateChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">As of:</span>
            <div className="w-36">
              <UniversalDatePicker
                value={asOfDate}
                onChange={onAsOfDateChange}
                placeholder="DD-MM-YY"
              />
            </div>
          </div>
        )}

        {/* From Date Picker */}
        {fromDate !== undefined && onFromDateChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">From:</span>
            <div className="w-36">
              <UniversalDatePicker
                value={fromDate}
                onChange={onFromDateChange}
                placeholder="DD-MM-YY"
              />
            </div>
          </div>
        )}

        {/* To Date Picker */}
        {toDate !== undefined && onToDateChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">To:</span>
            <div className="w-36">
              <UniversalDatePicker
                value={toDate}
                onChange={onToDateChange}
                placeholder="DD-MM-YY"
              />
            </div>
          </div>
        )}

        {/* Trade Type Filter */}
        {tradeType !== undefined && onTradeTypeChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">Type:</span>
            <div className="w-44">
              <UniversalDropdown
                value={tradeType}
                options={[
                  { value: 'ALL', label: 'All Trade Types' },
                  { value: 'REGULAR', label: 'Regular / Manual' },
                  { value: 'CARRY_FORWARD', label: 'Carry Forward (CF)' },
                  { value: 'BACK_FORWARD', label: 'Back Forward (BF)' },
                  { value: 'SETTLEMENT', label: 'Net Settlement' },
                ]}
                onChange={onTradeTypeChange}
                placeholder="Trade Type"
              />
            </div>
          </div>
        )}

        {/* Counterparty Client Dropdown */}
        {clientOptions && onClientChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">Client:</span>
            <div className="w-48">
              <UniversalDropdown
                value={clientId || ''}
                options={[{ value: '', label: 'All Clients' }, ...clientOptions]}
                onChange={onClientChange}
                placeholder="Filter Client"
              />
            </div>
          </div>
        )}

        {/* Counterparty Broker Dropdown */}
        {brokerOptions && onBrokerChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">Broker:</span>
            <div className="w-48">
              <UniversalDropdown
                value={brokerId || ''}
                options={[{ value: '', label: 'All Brokers' }, ...brokerOptions]}
                onChange={onBrokerChange}
                placeholder="Filter Broker"
              />
            </div>
          </div>
        )}

        {/* Script Dropdown */}
        {scriptOptions && onScriptChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap font-semibold">Script:</span>
            <div className="w-48">
              <UniversalDropdown
                value={scriptId || ''}
                options={[{ value: '', label: 'All Scripts' }, ...scriptOptions]}
                onChange={onScriptChange}
                placeholder="Filter Script"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
