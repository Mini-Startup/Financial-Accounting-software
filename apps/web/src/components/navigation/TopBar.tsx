'use client';

import { usePathname } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const PAGE_TITLES: Record<string, { title: string; section: string }> = {
  '/': { title: 'Dashboard', section: 'Overview' },
  '/trades': { title: 'Trades Blotter', section: 'Data' },
  '/closing-rates': { title: 'Closing Rates', section: 'Data' },
  '/clients': { title: 'Clients Master', section: 'Master' },
  '/brokers': { title: 'Brokers Master', section: 'Master' },
  '/scripts': { title: 'Scripts Master', section: 'Master' },
  '/exchanges': { title: 'Exchanges Master', section: 'Master' },
  '/currencies': { title: 'Currencies Master', section: 'Master' },
  '/expiry-dates': { title: 'Expiry Dates', section: 'Master' },
  '/brokerage': { title: 'Brokerage Rules', section: 'Master' },
  '/account-master': { title: 'Accounts Master', section: 'Master' },
};

export function TopBar() {
  const pathname = usePathname();
  const current = PAGE_TITLES[pathname] || {
    title: pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dashboard',
    section: 'BizzMate',
  };

  const handleOpenSearch = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-universal-search'));
    }
  };

  return (
    <header className="h-13 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0 select-none shadow-2xs">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="text-slate-400">{current.section}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 stroke-[1.75]" />
        <span className="font-semibold text-slate-800">{current.title}</span>
      </div>

      {/* Right: Universal Search Trigger Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleOpenSearch}
          className="flex items-center gap-2.5 h-8.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all text-xs text-slate-500 cursor-pointer shadow-2xs"
          title="Open Universal Search (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline text-slate-500">Search anything...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 font-bold shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>
    </header>
  );
}
