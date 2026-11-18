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
    <div className="print:hidden bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ─── GROUP BY DIMENSION TOGGLE ────────────────────────────────────── */}
        {groupBy && onGroupByChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Group By:
            </span>
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
              <button
                type="button"
                onClick={() => onGroupByChange('CLIENT')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                  groupBy === 'CLIENT'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="w-3.5 h-3.5" />
                Client
              </button>
              <button
                type="button"
                onClick={() => onGroupByChange('BROKER')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                  groupBy === 'BROKER'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Broker
              </button>
              <button
                type="button"
                onClick={() => onGroupByChange('SCRIPT')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                  groupBy === 'SCRIPT'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileCode className="w-3.5 h-3.5" />
                Script
              </button>
            </div>
          </div>
        )}

        {/* ─── SETTLEMENT CYCLE SELECTOR ─────────────────────────────────────── */}
        {settlementOptions && onSettlementChange && (
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Settlement:
            </span>
            <UniversalDropdown
              value={settlementId || ''}
              options={settlementOptions}
              onChange={onSettlementChange}
              placeholder="Select Settlement Cycle"
              className="w-full text-xs"
            />
          </div>
        )}

        {/* ─── SEARCH INPUT ─────────────────────────────────────────────────── */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        )}

        {/* ─── RESET FILTERS BUTTON ─────────────────────────────────────────── */}
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 rounded-lg border border-border/70 transition-colors cursor-pointer ml-auto"
            title="Reset Filters to Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* ─── SECONDARY ROW: DATE PICKERS & DROPDOWN FILTERS ─────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50 text-xs">
        {/* As Of Date Picker */}
        {asOfDate !== undefined && onAsOfDateChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">As of:</span>
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
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">From:</span>
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
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">To:</span>
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
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">Type:</span>
            <div className="w-40">
              <UniversalDropdown
                value={tradeType}
                options={[
                  { value: 'ALL', label: 'All Trade Types' },
                  { value: 'REGULAR', label: 'Regular' },
                  { value: 'CARRY_FORWARD', label: 'Carry Forward (CF)' },
                  { value: 'BACK_FORWARD', label: 'Back Forward (BF)' },
                  { value: 'SETTLEMENT', label: 'Settlement' },
                ]}
                onChange={onTradeTypeChange}
                className="w-full text-xs"
              />
            </div>
          </div>
        )}

        {/* Client Filter Dropdown */}
        {clientOptions && onClientChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">Client:</span>
            <div className="w-44">
              <UniversalDropdown
                value={clientId || ''}
                options={clientOptions}
                onChange={onClientChange}
                placeholder="All Clients"
                clearable
                className="w-full text-xs"
              />
            </div>
          </div>
        )}

        {/* Broker Filter Dropdown */}
        {brokerOptions && onBrokerChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">Broker:</span>
            <div className="w-44">
              <UniversalDropdown
                value={brokerId || ''}
                options={brokerOptions}
                onChange={onBrokerChange}
                placeholder="All Brokers"
                clearable
                className="w-full text-xs"
              />
            </div>
          </div>
        )}

        {/* Script Filter Dropdown */}
        {scriptOptions && onScriptChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap font-medium">Script:</span>
            <div className="w-44">
              <UniversalDropdown
                value={scriptId || ''}
                options={scriptOptions}
                onChange={onScriptChange}
                placeholder="All Scripts"
                clearable
                className="w-full text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
