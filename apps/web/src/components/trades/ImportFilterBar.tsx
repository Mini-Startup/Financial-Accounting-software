'use client';

import { Search } from 'lucide-react';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { UniversalDropdown } from '../ui/UniversalDropdown';

export type StatusFilterType = 'ALL' | 'VALID' | 'INVALID' | 'UNMAPPED_CLIENT' | 'UNMAPPED_SCRIPT' | 'UNMAPPED_EXCHANGE';

interface ImportFilterBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchColumn: string;
  setSearchColumn: (v: string) => void;
  exactMatch: boolean;
  setExactMatch: (v: boolean) => void;
  showValidOnly: boolean;
  setShowValidOnly: (v: boolean) => void;
  statusFilter: StatusFilterType;
  setStatusFilter: (v: StatusFilterType) => void;
  resetPage: () => void;
}

export function ImportFilterBar({
  searchQuery,
  setSearchQuery,
  searchColumn,
  setSearchColumn,
  exactMatch,
  setExactMatch,
  showValidOnly,
  setShowValidOnly,
  statusFilter,
  setStatusFilter,
  resetPage,
}: ImportFilterBarProps) {
  return (
    <div className="card p-4 bg-white border border-[var(--color-border-light)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Search Bar with Column Selector */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <div className="flex items-center bg-white border border-[var(--color-border-medium)] rounded-lg shadow-2xs hover:border-[var(--color-border-focus)] focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/15 transition-all w-full">
          {/* Column Select Dropdown */}
          <div className="w-[145px] shrink-0 border-r border-[var(--color-border-light)]">
            <UniversalDropdown
              value={searchColumn}
              onChange={(val) => {
                setSearchColumn(val);
                resetPage();
              }}
              searchable={false}
              options={[
                { value: 'clientCode', label: 'Client' },
                { value: 'dealerCode', label: 'Dealer Code' },
                { value: 'tickCode', label: 'Script / Tick Code' },
                { value: 'securityName', label: 'Security Name' },
                { value: 'marketCode', label: 'Market / Exchange' },
                { value: 'tradeDate', label: 'Trade Date' },
                { value: 'quantity', label: 'Quantity' },
                { value: 'price', label: 'Price / Rate' },
                { value: 'ALL', label: 'All Columns' },
              ]}
              triggerClassName="min-h-[34px] h-[34px] rounded-none rounded-l-lg border-0 bg-slate-50/70 hover:bg-slate-100 shadow-none px-2.5 text-[11px] font-semibold text-[var(--color-charcoal)]"
            />
          </div>

          {/* Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                searchColumn === 'ALL'
                  ? 'Search all columns (OR via comma/space: e.g. TCS, INFY)...'
                  : `Search in ${
                      searchColumn === 'clientCode'
                        ? 'Client'
                        : searchColumn === 'dealerCode'
                        ? 'Dealer Code'
                        : searchColumn === 'tickCode'
                        ? 'Script / Tick Code'
                        : searchColumn === 'securityName'
                        ? 'Security Name'
                        : searchColumn === 'marketCode'
                        ? 'Market / Exchange'
                        : searchColumn === 'orderId'
                        ? 'Exch Order ID'
                        : searchColumn === 'tradeDate'
                        ? 'Trade Date'
                        : searchColumn === 'quantity'
                        ? 'Quantity'
                        : searchColumn === 'price'
                        ? 'Price / Rate'
                        : searchColumn
                    } (supports OR: e.g. TCS, INFY)...`
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetPage();
              }}
              className="w-full text-xs pl-9 pr-8 py-2 border-none outline-none bg-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  resetPage();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Toggles */}
        <div className="flex items-center gap-4">
          <CustomCheckbox
            checked={exactMatch}
            onChange={(v) => {
              setExactMatch(v);
              resetPage();
            }}
            label="Exact Match"
          />

          <CustomCheckbox
            checked={showValidOnly}
            onChange={(v) => {
              setShowValidOnly(v);
              resetPage();
            }}
            label="Show Valid Only"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-slate)] font-semibold shrink-0">Filter:</span>
          <div className="w-[210px]">
            <UniversalDropdown
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as StatusFilterType);
                resetPage();
              }}
              searchable={false}
              options={[
                { value: 'ALL', label: 'All Parsed Rows' },
                { value: 'VALID', label: '✓ Valid Trades Only' },
                { value: 'INVALID', label: '⚠ Invalid / Unmapped Trades' },
                { value: 'UNMAPPED_CLIENT', label: '🔴 Unmapped Clients' },
                { value: 'UNMAPPED_SCRIPT', label: '🔴 Unmapped Scripts' },
                { value: 'UNMAPPED_EXCHANGE', label: '🔴 Unmapped Exchanges' },
              ]}
              triggerClassName="min-h-[34px] h-[34px] text-xs font-semibold px-2.5 py-1.5"
            />
          </div>
        </div>

        {(searchQuery || statusFilter !== 'ALL' || exactMatch || showValidOnly) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setExactMatch(false);
              setShowValidOnly(false);
              resetPage();
            }}
            className="text-xs font-semibold text-rose-600 hover:underline shrink-0"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
