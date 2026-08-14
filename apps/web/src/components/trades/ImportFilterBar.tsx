import { Search } from 'lucide-react';
import { CustomCheckbox } from '../ui/CustomCheckbox';

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
        <div className="flex items-center border border-slate-200 rounded-md bg-white shadow-sm overflow-hidden w-full focus-within:ring-2 focus-within:ring-[var(--color-primary-light)] focus-within:border-[var(--color-primary)]">
          {/* Column Select Dropdown */}
          <select
            value={searchColumn}
            onChange={(e) => {
              setSearchColumn(e.target.value);
              resetPage();
            }}
            className="bg-slate-50 text-xs font-semibold text-slate-700 px-3 py-2 border-r border-slate-200 outline-none cursor-pointer hover:bg-slate-100 transition-colors shrink-0"
          >
            <option value="clientCode">Client</option>
            <option value="dealerCode">Dealer Code</option>
            <option value="tickCode">Script / Tick Code</option>
            <option value="securityName">Security Name</option>
            <option value="marketCode">Market / Exchange</option>
            <option value="tradeDate">Trade Date</option>
            <option value="quantity">Quantity</option>
            <option value="price">Price / Rate</option>
            <option value="ALL">All Columns</option>
          </select>

          {/* Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                searchColumn === 'ALL'
                  ? 'Search across all columns...'
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
                    }...`
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
          <select
            value={statusFilter}
            onChange={(e: any) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
            className="input text-xs py-1.5 px-3 font-semibold bg-white border border-slate-200 rounded-md"
          >
            <option value="ALL">All Parsed Rows</option>
            <option value="VALID">✓ Valid Trades Only</option>
            <option value="INVALID">⚠ Invalid / Unmapped Trades</option>
            <option value="UNMAPPED_CLIENT">🔴 Unmapped Clients</option>
            <option value="UNMAPPED_SCRIPT">🔴 Unmapped Scripts</option>
            <option value="UNMAPPED_EXCHANGE">🔴 Unmapped Exchanges</option>
          </select>
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
