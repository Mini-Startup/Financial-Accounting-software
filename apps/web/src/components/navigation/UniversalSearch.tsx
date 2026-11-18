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
  BookText,
  Receipt,
  Scale,
  FolderOpen,
  PieChart,
  FileCheck2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type MainTab = 'All' | 'Pages' | 'Actions' | 'Shortcuts';

interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: 'Pages' | 'Actions' | 'Shortcuts';
  subCategory?: 'Blotter' | 'Report' | 'Master';
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string;
  badge?: string;
}

const REGISTRY: SearchItem[] = [
  // ── Pages: Core Blotters ────────────────────────────────────────
  {
    id: 'page-dashboard',
    title: 'Dashboard Overview',
    description: 'Financial KPI summary, active clients, and real-time blotter metrics',
    category: 'Pages',
    subCategory: 'Blotter',
    keywords: ['home', 'overview', 'summary', 'metrics', 'kpi', 'dashboard'],
    icon: LayoutDashboard,
    href: '/',
    badge: 'Blotter',
  },
  {
    id: 'page-trades',
    title: 'Trades Blotter',
    description: 'Interactive trading ledger with click-to-edit row inspection and instant filters',
    category: 'Pages',
    subCategory: 'Blotter',
    keywords: ['trade', 'transactions', 'orders', 'buy', 'sell', 'quantity', 'market rate', 'blotter'],
    icon: ArrowUpDown,
    href: '/trades',
    badge: 'Blotter',
  },
  {
    id: 'page-closing-rates',
    title: 'Closing Rates',
    description: 'End-of-day market settlement prices and mark-to-market rate management',
    category: 'Pages',
    subCategory: 'Blotter',
    keywords: ['rates', 'eod', 'closing', 'daily prices', 'market rates', 'mtm'],
    icon: TrendingUp,
    href: '/closing-rates',
    badge: 'Blotter',
  },
  {
    id: 'page-trade-import',
    title: 'Trade Import',
    description: 'Bulk CSV / Excel trade transaction import wizard with mapping validation',
    category: 'Pages',
    subCategory: 'Blotter',
    keywords: ['import', 'upload', 'csv', 'excel', 'trades import', 'files'],
    icon: FileSpreadsheet,
    href: '/trades?import=true',
    badge: 'Blotter',
  },
  {
    id: 'page-pos-import',
    title: 'Open Position Import',
    description: 'Carry forward, brought-forward (BF), and settlement position bulk import',
    category: 'Pages',
    subCategory: 'Blotter',
    keywords: ['open position', 'import', 'upload', 'carry forward', 'bf', 'cf'],
    icon: TrendingUp,
    href: '/closing-rates?import=true',
    badge: 'Blotter',
  },

  // ── Pages: Reports ──────────────────────────────────────────────
  {
    id: 'page-report-net-position',
    title: 'Net Position Report',
    description: 'Real-time open exposures, quantity aggregates, and MTM valuation across scripts',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['net position', 'open positions', 'mtm', 'exposure', 'market positions', 'reports', 'pnl'],
    icon: PieChart,
    href: '/reports/net-position',
    badge: 'Report',
  },
  {
    id: 'page-report-settlement-detail',
    title: 'Settlement Audit Report',
    description: 'Detailed contract-note audit trail, bills, brokerage charges, and trade breakdown',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['settlement audit', 'audit report', 'bill', 'settlement detail', 'breakdown', 'contract notes'],
    icon: FileCheck2,
    href: '/reports/settlement-detail',
    badge: 'Report',
  },
  {
    id: 'page-report-settlement-summary',
    title: 'Financial Settlement Sheet',
    description: 'Comprehensive financial settlement summary and party debit/credit statements',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['settlement sheet', 'summary', 'party balance', 'financial summary', 'pnl', 'reports'],
    icon: FileSpreadsheet,
    href: '/reports/settlement-summary',
    badge: 'Report',
  },
  {
    id: 'page-report-settlement-ops',
    title: 'Settlement Operations',
    description: 'Execute settlement cycle, generate party bills, and freeze processed periods',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['settlement', 'run settlement', 'billing', 'operations', 'settlement cycle', 'execute'],
    icon: FolderOpen,
    href: '/settlement',
    badge: 'Report',
  },
  {
    id: 'page-report-ledger',
    title: 'Ledger Report',
    description: 'Party-wise financial accounting ledger with chronological vouchers',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['ledger', 'statement', 'party ledger', 'debit', 'credit', 'account statement'],
    icon: BookText,
    href: '/ledger',
    badge: 'Report',
  },
  {
    id: 'page-report-voucher',
    title: 'Voucher Entry',
    description: 'Journal, payment, receipt, and adjustment voucher booking blotter',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['voucher', 'journal', 'payment', 'receipt', 'contra', 'entry', 'financial'],
    icon: Receipt,
    href: '/vouchers',
    badge: 'Report',
  },
  {
    id: 'page-report-trial-balance',
    title: 'Trial Balance',
    description: 'Double-entry trial balance report across asset, liability, and revenue groups',
    category: 'Pages',
    subCategory: 'Report',
    keywords: ['trial balance', 'tb', 'balances', 'financial statements', 'accounting', 'audit'],
    icon: Scale,
    href: '/trial-balance',
    badge: 'Report',
  },

  // ── Pages: Masters ──────────────────────────────────────────────
  {
    id: 'page-master-clients',
    title: 'Clients Master',
    description: 'Manage Sundry Debtors, contact telephone numbers, bank details, and opening balances',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['clients', 'customers', 'accounts', 'sundry debtors', 'parties'],
    icon: Users,
    href: '/clients',
    badge: 'Master',
  },
  {
    id: 'page-master-brokers',
    title: 'Brokers Master',
    description: 'Manage Sundry Creditors, clearing brokers, brokerage tariffs, and settlement terms',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['brokers', 'clearing', 'sundry creditors', 'agents'],
    icon: ShieldCheck,
    href: '/brokers',
    badge: 'Master',
  },
  {
    id: 'page-master-scripts',
    title: 'Scripts Master',
    description: 'Configure traded securities, commodity contracts, short names, lot sizes, and units',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['scripts', 'securities', 'instruments', 'commodities', 'symbols', 'lot size'],
    icon: ScrollText,
    href: '/scripts',
    badge: 'Master',
  },
  {
    id: 'page-master-exchanges',
    title: 'Exchanges Master',
    description: 'Bourses and marketplaces configuration (MCX, SGX, NYME, MDEX, LME)',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['exchanges', 'mcx', 'sgx', 'nyme', 'lme', 'mdex', 'bourses'],
    icon: Globe,
    href: '/exchanges',
    badge: 'Master',
  },
  {
    id: 'page-master-currencies',
    title: 'Currencies Master',
    description: 'Base currencies and FX symbols (INR ₹, USD $, MYR RM, etc.)',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['currencies', 'inr', 'usd', 'myr', 'fx', 'forex'],
    icon: Coins,
    href: '/currencies',
    badge: 'Master',
  },
  {
    id: 'page-master-expiries',
    title: 'Expiry Dates Master',
    description: 'Active contract expiry calendar and settlement cycle dates',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['expiries', 'expiry dates', 'settlement dates', 'contracts'],
    icon: Calendar,
    href: '/expiry-dates',
    badge: 'Master',
  },
  {
    id: 'page-master-brokerage',
    title: 'Brokerage Rules',
    description: 'Client and broker commission structures per script, volume, and lot',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['brokerage', 'commission', 'charges', 'rates'],
    icon: Percent,
    href: '/brokerage',
    badge: 'Master',
  },
  {
    id: 'page-master-others',
    title: 'Chart of Accounts (All)',
    description: 'Full chart of accounts across all ledger groups and classifications',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['accounts', 'ledger', 'groups', 'chart of accounts'],
    icon: Layers,
    href: '/account-master',
    badge: 'Master',
  },
  {
    id: 'page-admin-users',
    title: 'Users & Permissions',
    description: 'User access control, whitelist status, and administrative role assignments',
    category: 'Pages',
    subCategory: 'Master',
    keywords: ['users', 'roles', 'permissions', 'whitelist', 'admin'],
    icon: Users,
    href: '/users',
    badge: 'Master',
  },

  // ── Actions ─────────────────────────────────────────────────────
  {
    id: 'action-add-trade',
    title: 'Add New Trade',
    description: 'Open the trade entry modal directly with smart auto-focus and keyboard entry',
    category: 'Actions',
    keywords: ['new trade', 'create trade', 'enter trade', 'add order', 'new'],
    icon: Plus,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-open-add-trade'));
      }
    },
    href: '/trades?action=add',
    badge: 'Action',
  },
  {
    id: 'action-add-client',
    title: 'Add New Client',
    description: 'Open the client onboarding form with phone verification and spontaneous validation',
    category: 'Actions',
    keywords: ['new client', 'create customer', 'add client', 'debtor'],
    icon: Plus,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-open-add-client'));
      }
    },
    href: '/clients?action=add',
    badge: 'Action',
  },
  {
    id: 'action-add-broker',
    title: 'Add New Broker',
    description: 'Register a new clearing broker or creditor with banking details and contact info',
    category: 'Actions',
    keywords: ['new broker', 'create broker', 'add broker', 'creditor'],
    icon: Plus,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-open-add-broker'));
      }
    },
    href: '/brokers?action=add',
    badge: 'Action',
  },
  {
    id: 'action-new-voucher',
    title: 'Create Voucher Entry',
    description: 'Book payment, receipt, or journal debit/credit voucher',
    category: 'Actions',
    keywords: ['new voucher', 'create voucher', 'add payment', 'receipt'],
    icon: Plus,
    href: '/vouchers?action=add',
    badge: 'Action',
  },
  {
    id: 'action-toggle-sidebar',
    title: 'Toggle / Lock Sidebar',
    description: 'Pin or collapse the navigation sidebar directly on screen',
    category: 'Actions',
    keywords: ['sidebar', 'menu', 'collapse', 'expand', 'pin', 'lock'],
    icon: Sliders,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-toggle-sidebar'));
      }
    },
    shortcut: '[',
    badge: 'Action',
  },

  // ── Shortcuts ───────────────────────────────────────────────────
  {
    id: 'shortcut-search',
    title: 'Universal Search Palette',
    description: 'Quickly open this global search command palette anywhere in BizzMate',
    category: 'Shortcuts',
    keywords: ['search', 'find', 'palette', 'shortcut', 'command'],
    icon: Keyboard,
    shortcut: 'Ctrl + K',
    badge: 'Shortcut',
  },
  {
    id: 'shortcut-save',
    title: 'Submit / Save Modals',
    description: 'Instantly submit and commit active modal forms without clicking the button',
    category: 'Shortcuts',
    keywords: ['save', 'submit', 'modal', 'enter', 'shortcut'],
    icon: Keyboard,
    shortcut: 'Ctrl + Enter',
    badge: 'Shortcut',
  },
  {
    id: 'shortcut-escape',
    title: 'Close Modal / Dropdown',
    description: 'Dismiss any open dropdown, modal dialog, or search palette',
    category: 'Shortcuts',
    keywords: ['close', 'cancel', 'dismiss', 'escape'],
    icon: Keyboard,
    shortcut: 'Esc',
    badge: 'Shortcut',
  },
];

const MAIN_TABS: MainTab[] = ['All', 'Pages', 'Actions', 'Shortcuts'];

export function UniversalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('All');
  const [subCategory, setSubCategory] = useState<'All' | 'Blotter' | 'Report' | 'Master'>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Focus input and reset hover/keyboard states when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveTab('All');
      setSubCategory('All');
      setHoveredId(null);
      setKeyboardIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items based on active tab & query
  const filteredItems = useMemo(() => {
    let items = REGISTRY;
    if (activeTab !== 'All') {
      items = items.filter((item) => item.category === activeTab);
    }
    if (activeTab === 'Pages' && subCategory !== 'All') {
      items = items.filter((item) => item.subCategory === subCategory);
    }
    if (!query.trim()) {
      return items;
    }
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [activeTab, query]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      All: REGISTRY.length,
      Pages: REGISTRY.filter((i) => i.category === 'Pages').length,
      Actions: REGISTRY.filter((i) => i.category === 'Actions').length,
      Shortcuts: REGISTRY.filter((i) => i.category === 'Shortcuts').length,
    };
  }, []);

  // Handle selection of item
  const handleSelect = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);
      if (item.action) {
        item.action();
      }
      if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoveredId(null);
      setKeyboardIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoveredId(null);
      setKeyboardIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = keyboardIndex >= 0 ? keyboardIndex : 0;
      if (filteredItems[targetIndex]) {
        handleSelect(filteredItems[targetIndex]);
      }
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input (Clickable Esc Button in top right) */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-white">
          <Search className="w-5 h-5 text-[#2652C8] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setKeyboardIndex(-1);
              setHoveredId(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type to search pages, reports, actions, or masters... (e.g. trades, net position, add client)"
            className="w-full text-sm font-medium bg-transparent text-slate-900 placeholder:text-slate-400 outline-none caret-[#2652C8]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setKeyboardIndex(-1);
                setHoveredId(null);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          {/* Top-Right Clickable ESC Button (Fixed per user request) */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200/80 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            title="Click to close (Esc)"
          >
            <span>Esc</span>
          </button>
        </div>

        {/* Tab Navigation: Matching Reference Image (All | Pages | Actions | Shortcuts) */}
        <div className="flex items-center justify-between px-5 pt-2 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-1">
            {MAIN_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setSubCategory('All');
                    setKeyboardIndex(-1);
                    setHoveredId(null);
                  }}
                  className={cn(
                    'px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer relative shrink-0 select-none',
                    isActive
                      ? 'text-[#2652C8] border-b-2 border-[#2652C8] bg-blue-50/40'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  )}
                >
                  <span>{tab}</span>
                  <span
                    className={cn(
                      'ml-2 text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold',
                      isActive
                        ? 'bg-blue-100 text-[#2652C8]'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {tabCounts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Sub-Category Pills for Pages: Matching Reference Image (All | Blotter | Report | Master) */}
        {activeTab === 'Pages' && (
          <div className="flex items-center gap-1.5 px-5 py-2 bg-slate-50/70 border-b border-slate-100 select-none">
            {(['All', 'Blotter', 'Report', 'Master'] as const).map((sub) => {
              const isSubActive = subCategory === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setSubCategory(sub);
                    setKeyboardIndex(-1);
                    setHoveredId(null);
                  }}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none',
                    isSubActive
                      ? 'bg-blue-100/90 text-[#2652C8] border border-blue-200/90 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  )}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}

        {/* Results List: Reference Image Layout (No Black, Solid Centered Icon, Clear On Hover Out) */}
        <div
          ref={listRef}
          onMouseLeave={() => setHoveredId(null)}
          className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 px-6 text-center text-slate-400 text-xs">
              No results found for <strong className="text-slate-700">"{query}"</strong>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = hoveredId === item.id || (hoveredId === null && keyboardIndex === idx);
              const IconComp = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-colors my-0.5',
                    isSelected
                      ? 'bg-blue-50/70 ring-1 ring-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50'
                  )}
                >
                  {/* Left: Themed Primary / Accent Icon (Rock-solid Centered, NO transform on hover) */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                        item.category === 'Actions'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.category === 'Shortcuts'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-[#2652C8] border-blue-100'
                      )}
                    >
                      <IconComp className="w-4 h-4 stroke-[2]" />
                    </div>

                    {/* Title & Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.2 rounded-md font-sans border',
                              item.badge === 'Blotter' && 'bg-blue-50 text-[#2652C8] border-blue-200',
                              item.badge === 'Report' && 'bg-purple-50 text-purple-700 border-purple-200',
                              item.badge === 'Master' && 'bg-slate-100 text-slate-700 border-slate-200',
                              item.badge === 'Action' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              item.badge === 'Shortcut' && 'bg-amber-50 text-amber-800 border-amber-200'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Shortcut or Navigation Arrow */}
                  <div className="shrink-0 ml-3 flex items-center gap-2">
                    {item.shortcut ? (
                      <kbd className="text-[11px] font-mono px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-bold shadow-2xs">
                        {item.shortcut}
                      </kbd>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 font-semibold">
                        <span>Go</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint Bar: Primary Ledger Blue accents */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">esc</kbd>
              <span>dismiss</span>
            </span>
          </div>
          <span className="text-slate-400 font-sans">BizzMate Universal Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
