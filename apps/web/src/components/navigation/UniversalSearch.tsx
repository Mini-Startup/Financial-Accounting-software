'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Search,
  ArrowUpDown,
  Users,
  ShieldCheck,
  ScrollText,
  Globe,
  Coins,
  Calendar,
  Percent,
  TrendingUp,
  FileSpreadsheet,
  LayoutDashboard,
  Layers,
  Plus,
  Command,
  ArrowRight,
  X,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface SearchItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Masters' | 'Shortcuts';
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string;
}

const REGISTRY: SearchItem[] = [
  // ── Navigation ────────────────────────────────────────────────
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    category: 'Navigation',
    keywords: ['home', 'overview', 'summary', 'metrics', 'kpi'],
    icon: LayoutDashboard,
    href: '/',
  },
  {
    id: 'nav-trades',
    title: 'Trades Blotter',
    category: 'Navigation',
    keywords: ['trade', 'transactions', 'orders', 'buy', 'sell', 'quantity', 'market rate'],
    icon: ArrowUpDown,
    href: '/trades',
  },
  {
    id: 'nav-closing-rates',
    title: 'Closing Rates',
    category: 'Navigation',
    keywords: ['rates', 'eod', 'closing', 'daily prices', 'market rates'],
    icon: TrendingUp,
    href: '/closing-rates',
  },
  {
    id: 'nav-trade-import',
    title: 'Trade Import',
    category: 'Navigation',
    keywords: ['import', 'upload', 'csv', 'excel', 'trades import'],
    icon: FileSpreadsheet,
    href: '/trades?import=true',
  },
  {
    id: 'nav-pos-import',
    title: 'Open Position Import',
    category: 'Navigation',
    keywords: ['open position', 'import', 'upload', 'carry forward', 'bf', 'cf'],
    icon: TrendingUp,
    href: '/closing-rates?import=true',
  },

  // ── Masters ───────────────────────────────────────────────────
  {
    id: 'master-clients',
    title: 'Clients Master',
    category: 'Masters',
    keywords: ['clients', 'customers', 'accounts', 'sundry debtors', 'parties'],
    icon: Users,
    href: '/clients',
  },
  {
    id: 'master-brokers',
    title: 'Brokers Master',
    category: 'Masters',
    keywords: ['brokers', 'clearing', 'sundry creditors', 'agents'],
    icon: ShieldCheck,
    href: '/brokers',
  },
  {
    id: 'master-scripts',
    title: 'Scripts Master',
    category: 'Masters',
    keywords: ['scripts', 'securities', 'instruments', 'commodities', 'symbols', 'lot size'],
    icon: ScrollText,
    href: '/scripts',
  },
  {
    id: 'master-exchanges',
    title: 'Exchanges Master',
    category: 'Masters',
    keywords: ['exchanges', 'mcx', 'sgx', 'nyme', 'lme', 'mdex', 'bourses'],
    icon: Globe,
    href: '/exchanges',
  },
  {
    id: 'master-currencies',
    title: 'Currencies Master',
    category: 'Masters',
    keywords: ['currencies', 'inr', 'usd', 'myr', 'fx', 'forex'],
    icon: Coins,
    href: '/currencies',
  },
  {
    id: 'master-expiries',
    title: 'Expiry Dates Master',
    category: 'Masters',
    keywords: ['expiries', 'expiry dates', 'settlement dates', 'contracts'],
    icon: Calendar,
    href: '/expiry-dates',
  },
  {
    id: 'master-brokerage',
    title: 'Brokerage Setup',
    category: 'Masters',
    keywords: ['brokerage', 'commission', 'charges', 'rates'],
    icon: Percent,
    href: '/brokerage',
  },
  {
    id: 'master-others',
    title: 'Account Masters (All)',
    category: 'Masters',
    keywords: ['accounts', 'ledger', 'groups', 'chart of accounts'],
    icon: Layers,
    href: '/account-master',
  },

  // ── Actions ───────────────────────────────────────────────────
  {
    id: 'action-add-trade',
    title: 'Add New Trade',
    category: 'Actions',
    keywords: ['new trade', 'create trade', 'enter trade', 'add order'],
    icon: Plus,
    href: '/trades?action=add',
  },
  {
    id: 'action-add-client',
    title: 'Add New Client',
    category: 'Actions',
    keywords: ['new client', 'create customer', 'add client'],
    icon: Plus,
    href: '/clients?action=add',
  },
  {
    id: 'action-add-broker',
    title: 'Add New Broker',
    category: 'Actions',
    keywords: ['new broker', 'create broker', 'add broker'],
    icon: Plus,
    href: '/brokers?action=add',
  },

  // ── Keyboard Shortcuts ─────────────────────────────────────────
  {
    id: 'shortcut-search',
    title: 'Universal Search',
    category: 'Shortcuts',
    keywords: ['search', 'find', 'palette', 'shortcut', 'command'],
    icon: Keyboard,
    shortcut: 'Ctrl + K',
  },
  {
    id: 'shortcut-sidebar',
    title: 'Toggle / Lock Sidebar',
    category: 'Shortcuts',
    keywords: ['sidebar', 'menu', 'collapse', 'expand'],
    icon: Keyboard,
    shortcut: '[',
  },
  {
    id: 'shortcut-save',
    title: 'Submit / Save Modals',
    category: 'Shortcuts',
    keywords: ['save', 'submit', 'modal', 'enter'],
    icon: Keyboard,
    shortcut: 'Ctrl + Enter',
  },
];

export function UniversalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard listener for Ctrl+K / Cmd+K and custom trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-universal-search', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-universal-search', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return REGISTRY;
    }
    const q = query.toLowerCase().trim();
    return REGISTRY.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [query]);

  // Handle selection of item
  const handleSelect = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        handleSelect(filteredItems[activeIndex]);
      }
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-start justify-center pt-20 p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, masters, features, actions... (or type e.g. trades, client)"
            className="w-full text-sm bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[11px] font-mono text-slate-400 border border-slate-200 bg-white px-2 py-0.5 rounded-lg shadow-2xs">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching pages, masters, or actions found for <strong className="text-slate-600">"{query}"</strong>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const IconComp = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors my-0.5',
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-semibold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="truncate text-slate-900 font-medium">{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut ? (
                      <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                        {item.shortcut}
                      </kbd>
                    ) : (
                      isSelected && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold font-mono">
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">↵</kbd> select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">esc</kbd> close
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">BizzMate Universal Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
