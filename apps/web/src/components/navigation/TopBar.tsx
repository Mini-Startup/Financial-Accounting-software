'use client';

import { usePathname } from 'next/navigation';
import { Search, Command } from 'lucide-react';
import { useTopBar } from '@/context/TopBarContext';

const DEFAULT_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/trades': 'Trades',
  '/closing-rates': 'Closing Rates',
  '/clients': 'Clients',
  '/brokers': 'Brokers',
  '/scripts': 'Scripts',
  '/exchanges': 'Exchanges',
  '/currencies': 'Currencies',
  '/expiry-dates': 'Expiry Dates',
  '/brokerage': 'Brokerage',
  '/account-master': 'Accounts',
  '/reports/net-position': 'Net Position',
  '/reports/settlement-detail': 'Settlement Audit',
  '/reports/settlement-summary': 'Settlement Summary',
  '/settlement': 'Settlement Operations',
  '/ledger': 'Ledger',
  '/vouchers': 'Vouchers',
  '/trial-balance': 'Trial Balance',
  '/users': 'Users & Roles',
};

export function TopBar() {
  const pathname = usePathname();
  const { config } = useTopBar();

  // Page title: priority given to active page config, then default route title
  const activeTitle = config.title || DEFAULT_TITLES[pathname] || pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dashboard';

  const handleOpenSearch = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-universal-search'));
    }
  };

  return (
    <header className="h-17 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between shrink-0 select-none">
      {/* Left: Clean Simple Title (No redundant badges, no wordy fluff) */}
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
          {activeTitle}
        </h1>
        {config.description && (
          <p className="text-2xs text-slate-400 font-normal truncate leading-none mt-1">
            {config.description}
          </p>
        )}
      </div>

      {/* Right: Universal Search Bar + Dynamic Page Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={handleOpenSearch}
          className="w-56 sm:w-64 md:w-80 h-9 px-3.5 bg-slate-100/90 hover:bg-slate-100 text-slate-500 rounded-lg flex items-center justify-between border border-slate-200/80 shadow-2xs transition-all cursor-pointer group hover:border-blue-400 hover:ring-2 hover:ring-blue-100"
          title="Search anything... (Ctrl+K / ⌘K)"
        >
          <div className="flex items-center gap-2 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-slate-500 font-medium">Search...</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold shadow-2xs flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5 text-slate-400" />
            <span>K</span>
          </kbd>
        </button>

        {/* Dynamic Page Action Buttons Rendered from Active Page (Add Trade, Import, etc.) */}
        {config.actions && (
          <div className="flex items-center gap-2">
            {config.actions}
          </div>
        )}
      </div>
    </header>
  );
}
