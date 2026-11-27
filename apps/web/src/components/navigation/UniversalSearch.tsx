'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
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
  FileSpreadsheet,
  Plus,
  ArrowRight,
  X,
  BookText,
  PieChart,
  Sliders,
  Sparkles,
  ExternalLink,
  FileText,
  RotateCcw,
  Keyboard,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTableSearch } from '@/context/TableSearchContext';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

export type MainCategoryTab = 'All' | 'Pages' | 'Actions' | 'Reports' | 'Entities' | 'Shortcuts';

export interface MultiFieldCondition {
  id: string;
  column: string;
  operator: 'contains' | 'equals' | 'starts_with';
  value: string;
  conjunction: 'AND' | 'OR';
}

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: 'Pages' | 'Actions' | 'Reports' | 'Entities' | 'Shortcuts';
  keywords: string[];
  lowerTitle?: string;
  lowerKeywords?: string[];
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string;
  isExternalTab?: boolean;
  entityKind?: 'CLIENT' | 'BROKER' | 'SCRIPT';
  entityRank?: number; // Lower = higher sub-rank within matched entity
}

const STATIC_REGISTRY: SearchItem[] = [
  // ── Pages: Core Operations & Trading ──────────────────────────────
  {
    id: 'page-trades',
    title: 'Trades',
    description: 'Trading records, transactions, market orders, and execution filters',
    category: 'Pages',
    keywords: ['trade', 'trades', 'transactions', 'orders', 'buy', 'sell', 'quantity', 'market rate'],
    icon: ArrowUpDown,
    href: '/trades',
  },
  {
    id: 'page-dashboard',
    title: 'Dashboard Overview',
    description: 'Financial KPI summary, active clients, turnover, and real-time ledger metrics',
    category: 'Pages',
    keywords: ['dashboard', 'home', 'overview', 'kpi', 'metrics', 'analytics', 'turnover'],
    icon: Globe,
    href: '/',
  },
  {
    id: 'page-closing-rates',
    title: 'Closing Rates',
    description: 'Daily settlement closing prices, market valuations, and contract mark-to-market rates',
    category: 'Pages',
    keywords: ['closing rates', 'rates', 'cmp', 'market price', 'settlement price', 'daily rates', 'script'],
    icon: Coins,
    href: '/closing-rates',
  },
  {
    id: 'page-trade-import',
    title: 'Trade File Import',
    description: 'Dynamic CSV / Excel trade transaction import with flexible column mapping',
    category: 'Pages',
    keywords: ['trade file import', 'import', 'upload', 'csv', 'excel', 'trades import', 'upload trades'],
    icon: FileSpreadsheet,
    href: '/trades?import=true',
  },
  {
    id: 'page-closing-rates-import',
    title: 'Closing Rates Import',
    description: 'Import daily settlement closing rates from external CSV/Excel sheets',
    category: 'Pages',
    keywords: ['import rates', 'closing rate import', 'upload rates', 'rate file'],
    icon: FileSpreadsheet,
    href: '/closing-rates?import=true',
  },
  {
    id: 'page-file-import-rules',
    title: 'File Import Rules',
    description: 'Manage CSV templates, brokerage fee formulas, exclusions, swaps, and mappings',
    category: 'Pages',
    keywords: ['file import rules', 'templates', 'column mapping', 'brokerage rule', 'exclude', 'swap'],
    icon: Sliders,
    href: '/file-import-rules',
  },

  // ── Pages: Financial Reports & Statements ─────────────────────────
  {
    id: 'report-net-position',
    title: 'Net Position Report',
    description: 'Open market positions, contract quantities, closing rates, and MTM valuations',
    category: 'Reports',
    keywords: ['net position', 'open position', 'mtm', 'exposure', 'positions', 'contracts', 'client', 'broker', 'script'],
    icon: PieChart,
    href: '/reports/net-position',
  },
  {
    id: 'report-invoices',
    title: 'Client & Broker Invoices',
    description: 'Bilateral settled contract invoices and futures billing statements',
    category: 'Reports',
    keywords: ['invoice', 'invoices', 'bill', 'billing', 'statement', 'contract note', 'client', 'broker'],
    icon: FileText,
    href: '/reports/invoice',
  },
  {
    id: 'report-settlement-detail',
    title: 'Settlement Audit Report',
    description: 'Trade provenance categorized into Regular, Carry Forward, Back Forward, and Settlement',
    category: 'Reports',
    keywords: ['settlement audit', 'trade provenance', 'carry forward', 'back forward', 'audit report', 'client'],
    icon: ScrollText,
    href: '/reports/settlement-detail',
  },
  {
    id: 'report-settlement-summary',
    title: 'Settlement Summary (Reconciliation)',
    description: 'Firm-wide counterparty reconciliation, clearing balance sheet, and imbalance audits',
    category: 'Reports',
    keywords: ['settlement summary', 'reconciliation', 'clearing sheet', 'balance sheet', 'client', 'broker'],
    icon: FileText,
    href: '/reports/settlement-summary',
  },
  {
    id: 'page-settlement',
    title: 'Settlement Operations',
    description: 'Manage weekly/monthly settlement cycles, clearing execution, and cycle rollovers',
    category: 'Pages',
    keywords: ['settlement', 'cycle', 'rollover', 'clearing', 'settle', 'close cycle'],
    icon: Sliders,
    href: '/settlement',
  },
  {
    id: 'page-ledger',
    title: 'Ledger Report',
    description: 'Detailed double-entry financial ledger statements, debit/credit journal, running balance',
    category: 'Reports',
    keywords: ['ledger', 'account statement', 'transactions', 'journal', 'running balance', 'client', 'broker'],
    icon: BookText,
    href: '/ledger',
  },
  {
    id: 'page-vouchers',
    title: 'Voucher Register',
    description: 'Bank payment, receipt, journal, and contra voucher postings',
    category: 'Pages',
    keywords: ['voucher', 'vouchers', 'payment', 'receipt', 'journal entry', 'contra'],
    icon: FileText,
    href: '/vouchers',
  },
  {
    id: 'page-trial-balance',
    title: 'Trial Balance',
    description: 'Consolidated debit and credit trial balance summary across all account heads',
    category: 'Reports',
    keywords: ['trial balance', 'accounting balance', 'general ledger', 'debit total', 'credit total'],
    icon: BookText,
    href: '/trial-balance',
  },

  // ── Pages: Master Data & Entities ─────────────────────────────────
  {
    id: 'page-clients',
    title: 'Clients Master',
    description: 'Client account directory, KYC credentials, brokerage plans, and margins',
    category: 'Pages',
    keywords: ['client', 'clients', 'accounts', 'parties', 'customer', 'customer list'],
    icon: Users,
    href: '/clients',
  },
  {
    id: 'page-brokers',
    title: 'Brokers Master',
    description: 'Clearing broker directory, turnover slabs, rebate structures, and counterparty records',
    category: 'Pages',
    keywords: ['broker', 'brokers', 'clearing broker', 'counterparties', 'sub broker'],
    icon: ShieldCheck,
    href: '/brokers',
  },
  {
    id: 'page-scripts',
    title: 'Scripts Master',
    description: 'Configure securities, commodity contracts, short names, lot sizes, and units',
    category: 'Pages',
    keywords: ['script', 'scripts', 'symbols', 'instruments', 'contracts', 'lot size', 'security'],
    icon: ScrollText,
    href: '/scripts',
  },
  {
    id: 'page-exchanges',
    title: 'Exchanges Master',
    description: 'Configure trading exchange venues (NSE, MCX, BSE, GIFT-NIFTY, DGCX)',
    category: 'Pages',
    keywords: ['exchange', 'exchanges', 'nse', 'mcx', 'bse', 'dgcx', 'market venue'],
    icon: Globe,
    href: '/exchanges',
  },
  {
    id: 'page-currencies',
    title: 'Currencies Master',
    description: 'Currency configuration, decimal precisions, and multi-currency exchange rates',
    category: 'Pages',
    keywords: ['currency', 'currencies', 'inr', 'usd', 'fx', 'exchange rate'],
    icon: Coins,
    href: '/currencies',
  },
  {
    id: 'page-expiry-dates',
    title: 'Expiry Dates Master',
    description: 'Contract settlement expiry dates, settlement cycles, and derivative maturities',
    category: 'Pages',
    keywords: ['expiry', 'expiries', 'expiry dates', 'maturity', 'contract cycle'],
    icon: Calendar,
    href: '/expiry-dates',
  },
  {
    id: 'page-brokerage',
    title: 'Brokerage Rules',
    description: 'Formulaic commission tiers, turnover-based calculation, per-lot tariffs',
    category: 'Pages',
    keywords: ['brokerage', 'commission', 'charges', 'rates', 'brokerage rules', 'slabs'],
    icon: Percent,
    href: '/brokerage',
  },
  {
    id: 'page-account-master',
    title: 'Chart of Accounts (All)',
    description: 'Universal ledger accounts hierarchy, asset, liability, expense & income accounts',
    category: 'Pages',
    keywords: ['chart of accounts', 'account master', 'general ledger', 'balance sheet heads'],
    icon: BookText,
    href: '/account-master',
  },
  {
    id: 'page-users',
    title: 'Users & Permissions',
    description: 'Role-based access control, operator logins, audit permissions, and security',
    category: 'Pages',
    keywords: ['users', 'roles', 'permissions', 'security', 'admin', 'operator'],
    icon: Users,
    href: '/users',
  },
  {
    id: 'page-recycle-bin',
    title: 'Recycle Bin & Data Recovery',
    description: 'View and restore deleted trades, accounts, closing rates, vouchers, and masters',
    category: 'Pages',
    keywords: ['recycle bin', 'deleted items', 'restore', 'trash', 'recover', 'undo delete', 'deleted'],
    icon: RotateCcw,
    href: '/recycle-bin',
  },

  // ── Quick Actions ────────────────────────────────────────────────
  {
    id: 'action-add-trade',
    title: 'Add New Trade',
    description: 'Open the quick trade entry modal with smart keyboard focus',
    category: 'Actions',
    keywords: ['add trade', 'new trade', 'create trade', 'enter trade', 'add order', 'trade entry', 'trades'],
    icon: Plus,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-open-add-trade'));
      }
    },
    href: '/trades?action=add',
  },
  {
    id: 'action-add-client',
    title: 'Add New Client',
    description: 'Register a new institutional or retail client account',
    category: 'Actions',
    keywords: ['add client', 'new client', 'create client', 'new account', 'add party'],
    icon: Plus,
    href: '/clients?action=add',
  },
  {
    id: 'action-add-broker',
    title: 'Add New Broker',
    description: 'Register a new clearing broker or counterparty firm',
    category: 'Actions',
    keywords: ['add broker', 'new broker', 'create broker'],
    icon: Plus,
    href: '/brokers?action=add',
  },
  {
    id: 'action-create-voucher',
    title: 'Create Voucher Entry',
    description: 'Record an accounting payment, receipt, journal, or contra entry',
    category: 'Actions',
    keywords: ['new voucher', 'create voucher', 'add payment', 'record receipt', 'journal entry'],
    icon: Plus,
    href: '/vouchers?action=new',
  },
  {
    id: 'action-open-recycle-bin',
    title: 'Open Recycle Bin',
    description: 'Jump to deleted records recovery center and restore deleted entries',
    category: 'Actions',
    keywords: ['restore deleted', 'open recycle bin', 'undo delete', 'recover items', 'recover trades'],
    icon: RotateCcw,
    href: '/recycle-bin',
  },
  {
    id: 'action-view-netpos',
    title: 'Preview & Export Net Position Report',
    description: 'Open standalone report document reader to view, print, or download PDF/Excel',
    category: 'Actions',
    keywords: ['export net position', 'download net position', 'net position pdf', 'preview report'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=net-position', '_blank');
    },
  },
  {
    id: 'action-view-invoice',
    title: 'Preview & Export Invoice Statement',
    description: 'Open standalone document reader for client and broker billing invoices',
    category: 'Actions',
    keywords: ['export invoice', 'download invoice', 'invoice pdf', 'preview invoice'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=invoice', '_blank');
    },
  },
  {
    id: 'action-view-settle-audit',
    title: 'Preview & Export Settlement Audit',
    description: 'Open standalone document reader for settlement trade breakdown',
    category: 'Actions',
    keywords: ['export settlement audit', 'download settlement', 'settlement pdf'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=settlement-detail', '_blank');
    },
  },
  {
    id: 'action-view-settle-summary',
    title: 'Preview & Export Settlement Summary Sheet',
    description: 'Open standalone document reader for counterparty reconciliation clearing balance sheet',
    category: 'Actions',
    keywords: ['export settlement summary', 'clearing sheet pdf', 'reconciliation export'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=settlement-summary', '_blank');
    },
  },
  {
    id: 'action-toggle-sidebar',
    title: 'Toggle / Lock Sidebar',
    description: 'Pin or collapse the left navigation sidebar',
    category: 'Actions',
    keywords: ['sidebar', 'menu', 'collapse', 'expand', 'pin', 'lock'],
    icon: Sliders,
    shortcut: '[',
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-toggle-sidebar'));
      }
    },
  },

  // ── Keyboard Shortcuts ───────────────────────────────────────────
  {
    id: 'shortcut-app-search',
    title: 'App-Wide Search Command Center',
    description: 'Open global search across pages, reports, clients, brokers, scripts, and actions',
    category: 'Shortcuts',
    keywords: ['shortcut', 'ctrl+k', 'search', 'command', 'palette'],
    icon: Keyboard,
    shortcut: 'Ctrl + K',
  },
  {
    id: 'shortcut-table-search',
    title: 'Search Data on Current Page',
    description: 'Open multi-column live table filter modal (falls back to browser find on non-table pages)',
    category: 'Shortcuts',
    keywords: ['shortcut', 'ctrl+f', 'filter', 'table search', 'find'],
    icon: Keyboard,
    shortcut: 'Ctrl + F',
  },
  {
    id: 'shortcut-save-modal',
    title: 'Submit / Save Active Modal',
    description: 'Save form entries cleanly without lifting hands from keyboard',
    category: 'Shortcuts',
    keywords: ['shortcut', 'ctrl+enter', 'save', 'submit', 'modal'],
    icon: Keyboard,
    shortcut: 'Ctrl + Enter',
  },
  {
    id: 'shortcut-toggle-sidebar',
    title: 'Toggle Navigation Sidebar Lock',
    description: 'Collapse or expand the side menu for wider spreadsheet view',
    category: 'Shortcuts',
    keywords: ['shortcut', '[', 'sidebar', 'collapse', 'expand'],
    icon: Keyboard,
    shortcut: '[',
  },
  {
    id: 'shortcut-close-modal',
    title: 'Dismiss Modal / Dropdown',
    description: 'Immediately close open popovers, drawers, or search dialog',
    category: 'Shortcuts',
    keywords: ['shortcut', 'esc', 'escape', 'close', 'cancel'],
    icon: Keyboard,
    shortcut: 'Esc',
  },
];

// Pre-index static items once at module load
const INDEXED_STATIC_REGISTRY: SearchItem[] = STATIC_REGISTRY.map((item) => ({
  ...item,
  lowerTitle: item.title.toLowerCase(),
  lowerKeywords: item.keywords.map((k) => k.toLowerCase()),
}));

function getRecordValue(record: any, key: string): any {
  if (!record || !key) return '';

  // Domain column aliases used in Page Table definitions (e.g. Trades, Scripts, Closing Rates, Accounts)
  if (key === 'client' || key === 'account') {
    const code = record.account?.code || record.clientCode || '';
    const name = record.account?.name || record.clientName || record.client || '';
    if (code && name && code !== name) return `${code} - ${name}`;
    return code || name;
  }
  if (key === 'broker') {
    const code = record.broker?.code || record.brokerCode || '';
    const name = record.broker?.name || record.brokerName || '';
    if (code && name && code !== name) return `${code} - ${name}`;
    return code || name;
  }
  if (key === 'securityName') {
    return record.securityName || record.script?.fullName || record.script?.shortName || '';
  }
  if (key === 'script' || key === 'symbol') {
    const short = record.script?.shortName || record.shortName || record.symbol || '';
    const full = record.script?.fullName || record.fullName || '';
    if (short && full && short !== full) return `${short} (${full})`;
    return short || full;
  }
  if (key === 'tradeDate' || key === 'date' || key === 'rateDate') {
    const raw = record[key] || record.tradeDate || record.rateDate || record.date || record.normalizedDate;
    if (!raw) return '';
    return formatDateToDDMMYY(raw) || String(raw);
  }
  if (key === 'expiry') {
    return record.expiry ? formatDateToDDMMYY(record.expiry) || String(record.expiry) : '';
  }
  if (key === 'price') {
    const val = record.price ?? record.rate;
    return val !== undefined && val !== null ? String(val) : '';
  }
  if (key === 'exchange') {
    return record.exchange?.code || record.exchange?.name || (typeof record.exchange === 'string' ? record.exchange : '');
  }
  if (key === 'currency') {
    return record.currency?.code || record.currency?.symbol || (typeof record.currency === 'string' ? record.currency : '');
  }
  if (key === 'contact') {
    return record.mobileNumber || record.whatsappNumber || record.email || '';
  }

  // Nested dot notation e.g. "exchange.code", "account.code", "group.name"
  if (key.includes('.')) {
    const parts = key.split('.');
    let cur = record;
    for (const p of parts) {
      if (cur == null) return '';
      cur = cur[p];
    }
    return cur ?? '';
  }

  // Direct property check
  if (record[key] !== undefined && record[key] !== null) {
    if (typeof record[key] === 'object') {
      return (
        record[key].code ||
        record[key].shortName ||
        record[key].name ||
        record[key].symbol ||
        record[key].label ||
        ''
      );
    }
    return record[key];
  }

  return '';
}

function getAllSearchableStrings(record: any): { key: string; label: string; value: string }[] {
  if (!record || typeof record !== 'object') return [];
  const entries: { key: string; label: string; value: string }[] = [];

  for (const [k, v] of Object.entries(record)) {
    if (v === null || v === undefined || k === 'id' || k === 'isDeleted' || k === 'createdAt' || k === 'updatedAt') {
      continue;
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      const str = String(v).trim();
      if (str) entries.push({ key: k, label: k, value: str });
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      for (const [subK, subV] of Object.entries(v as any)) {
        if (typeof subV === 'string' || typeof subV === 'number') {
          const str = String(subV).trim();
          if (str) entries.push({ key: `${k}.${subK}`, label: `${k} ${subK}`, value: str });
        }
      }
    }
  }
  return entries;
}

function highlightMatch(text: any, query: string): React.ReactNode {
  const str = String(text ?? '');
  if (!query?.trim() || !str) return str;
  const terms = query
    .toLowerCase()
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean);
  if (terms.length === 0) return str;

  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = str.split(pattern);

  return parts.map((part, i) =>
    terms.some((t) => part.toLowerCase() === t.toLowerCase()) ? (
      <mark key={i} className="bg-blue-100 text-[#1D4ED8] font-bold px-0.5 rounded-xs">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ── Item Ranking & Scoring Engine ──────────────────────────────────────
function computeItemScore(item: SearchItem, q: string, baseQ: string): number {
  const title = item.lowerTitle || item.title.toLowerCase();
  const keywords = item.lowerKeywords || item.keywords.map((k) => k.toLowerCase());

  // Entity-specific dynamic items (Clients, Brokers, Scripts + their reports/actions):
  // ONLY match when query actually targets the entity code/name!
  if (item.entityKind) {
    // Primary entity identifiers are stored at index 0 and 1 (e.g. code, name)
    const primaryMatches = keywords.slice(0, 2).some(
      (kw) => kw && (kw === q || kw === baseQ || kw.startsWith(q) || (q.length >= 2 && kw.includes(q)))
    );
    const fullPhraseMatches = keywords.some(
      (kw) => kw && (kw === q || kw === baseQ || kw.startsWith(q))
    );
    if (!primaryMatches && !fullPhraseMatches) {
      return 0;
    }

    let score = 4000;
    if (keywords[0] === q || keywords[0] === baseQ || keywords[1] === q) {
      score += 6000; // Exact code/name match (e.g. "ele01" or "gold")
    } else if (keywords[0]?.startsWith(q) || keywords[1]?.startsWith(q)) {
      score += 3000;
    }

    // Sub-rank strictly puts:
    // 1. Entity Master Page first (entityRank = 1)
    // 2. All possible Reports next (entityRank = 2..6)
    // 3. Quick Actions last (entityRank = 10)
    score -= (item.entityRank ?? 5) * 100;
    return score;
  }

  // Pinned canonical routing for generic noun searches
  if (baseQ === 'trade') {
    if (item.id === 'page-trades') return 12000;
    if (item.id === 'action-add-trade') return 11000;
    if (item.id === 'page-trade-import') return 10000;
  }
  if (baseQ === 'client') {
    if (item.id === 'page-clients') return 12000; // #1 Client Page
    if (item.id === 'report-net-position') return 11200;
    if (item.id === 'report-invoices') return 11100; // Extra Invoice Report for Clients
    if (item.id === 'page-ledger') return 11000;
    if (item.id === 'report-settlement-detail') return 10900;
    if (item.id === 'report-settlement-summary') return 10800;
    if (item.id === 'action-add-client') return 10000;
  }
  if (baseQ === 'broker') {
    if (item.id === 'page-brokers') return 12000; // #1 Broker Page
    if (item.id === 'report-net-position') return 11200;
    if (item.id === 'report-invoices') return 11100; // Extra Invoice Report for Brokers
    if (item.id === 'page-ledger') return 11000;
    if (item.id === 'report-settlement-summary') return 10800;
    if (item.id === 'action-add-broker') return 10000;
  }
  if (baseQ === 'script') {
    if (item.id === 'page-scripts') return 12000; // #1 Script Page
    if (item.id === 'report-net-position') return 11200;
    if (item.id === 'page-closing-rates') return 11000;
    if (item.id === 'page-trades') return 10800;
  }
  if (baseQ === 'settle' || baseQ === 'settlement') {
    if (item.id === 'page-settlement') return 12000;
    if (item.id === 'report-settlement-summary') return 11000;
    if (item.id === 'report-settlement-detail') return 10500;
  }
  if (baseQ === 'net position' || baseQ === 'open position') {
    if (item.id === 'report-net-position') return 12000;
    if (item.id === 'action-view-netpos') return 11000;
  }

  let score = 0;

  if (title === q || title === baseQ || title === `${baseQ}s`) {
    score += 4000;
  } else if (title.startsWith(q) || title.startsWith(baseQ)) {
    score += 2000;
  } else if (title.includes(q)) {
    score += 800;
  }

  const titleWords = title.split(/[\s-]+/);
  if (titleWords.some((w) => w === q || w === baseQ || w === `${baseQ}s`)) {
    score += 1500;
  } else if (titleWords.some((w) => w.startsWith(q))) {
    score += 600;
  }

  for (const kw of keywords) {
    if (kw === q || kw === baseQ) {
      score = Math.max(score, 3000);
    } else if (kw.startsWith(q)) {
      score = Math.max(score, 1200);
    } else if (kw.includes(q) && q.length >= 2) {
      score = Math.max(score, 500);
    }
  }

  if (score > 0) {
    if (item.category === 'Pages') score += 500;
    else if (item.category === 'Reports') score += 400;
    else if (item.category === 'Actions') score += 300;
    else if (item.category === 'Shortcuts') score += 200;
  }

  return score;
}

export function UniversalSearch() {
  const { isOpen, mode, setMode, closeModal, activeTable } = useTableSearch();

  // Instant responsive local states (eliminates typing lag!)
  const [appInput, setAppInput] = useState('');
  const [tableInput, setTableInput] = useState('');
  const deferredAppQuery = useDeferredValue(appInput);
  const deferredTableQuery = useDeferredValue(tableInput);

  const [activeTab, setActiveTab] = useState<MainCategoryTab>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(-1);

  // Table Mode States: AND/OR toggle (default OR), Column Dropdown, Multi-Col Query Builder
  const [searchMatchMode, setSearchMatchMode] = useState<'AND' | 'OR'>('OR');
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isMultiFieldOpen, setIsMultiFieldOpen] = useState(false);
  const [conditions, setConditions] = useState<MultiFieldCondition[]>([]);

  // Dynamic accounts & scripts loaded once for instant deep entity search
  const [dynamicEntities, setDynamicEntities] = useState<SearchItem[]>([]);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Load Clients, Brokers, Scripts for instant entity search
  useEffect(() => {
    async function loadEntities() {
      try {
        const [accRes, scrRes] = await Promise.all([
          apiFetch('/account-masters'),
          apiFetch('/scripts'),
        ]);

        const rawItems: SearchItem[] = [];

        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs)) {
            accs.forEach((a: any) => {
              const isBroker = a.group?.name?.toUpperCase()?.includes('BROKER') || a.group?.name?.toUpperCase()?.includes('CREDITOR');
              const roleLabel = isBroker ? 'Broker' : 'Client';
              const entityKind = isBroker ? 'BROKER' : 'CLIENT';

              // Rank 1: Respective Master Page
              rawItems.push({
                id: `entity-${a.id}`,
                title: `${a.code} - ${a.name}`,
                description: `${roleLabel} Master Profile • Account directory & settings`,
                category: 'Entities',
                keywords: [a.code || '', a.name || '', roleLabel.toLowerCase()],
                icon: isBroker ? ShieldCheck : Users,
                href: isBroker ? `/brokers?id=${a.id}` : `/clients?id=${a.id}`,
                entityKind,
                entityRank: 1,
              });

              // Rank 2..5: All Possible Reports (Invoices included extra for Clients & Brokers!)
              rawItems.push({
                id: `action-netpos-${a.id}`,
                title: `Net Position Report — "${a.code}"`,
                description: `Open positions & MTM valuation for ${a.name}`,
                category: 'Reports',
                keywords: [a.code || '', a.name || '', 'net position', 'open position'],
                icon: PieChart,
                href: `/report-viewer?type=net-position&entityId=${a.id}&groupBy=${isBroker ? 'BROKER' : 'CLIENT'}`,
                entityKind,
                entityRank: 2,
              });

              rawItems.push({
                id: `action-invoice-${a.id}`,
                title: `Invoice Statement — "${a.code}"`,
                description: `Bilateral settled futures bill & contract invoice for ${a.name}`,
                category: 'Reports',
                keywords: [a.code || '', a.name || '', 'invoice', 'bill', 'statement'],
                icon: FileText,
                href: `/report-viewer?type=invoice&entityType=${isBroker ? 'BROKER' : 'CLIENT'}&entityId=${a.id}`,
                entityKind,
                entityRank: 3,
              });

              rawItems.push({
                id: `action-ledger-${a.id}`,
                title: `Ledger Statement — "${a.code}"`,
                description: `Financial accounting transactions and debit/credit ledger for ${a.name}`,
                category: 'Reports',
                keywords: [a.code || '', a.name || '', 'ledger', 'statement'],
                icon: BookText,
                href: `/ledger?accountId=${a.id}`,
                entityKind,
                entityRank: 4,
              });

              if (!isBroker) {
                rawItems.push({
                  id: `action-settle-audit-${a.id}`,
                  title: `Settlement Audit Report — "${a.code}"`,
                  description: `Trade provenance categorized for ${a.name}`,
                  category: 'Reports',
                  keywords: [a.code || '', a.name || '', 'settlement audit', 'audit'],
                  icon: ScrollText,
                  href: `/report-viewer?type=settlement-detail&clientId=${a.id}`,
                  entityKind,
                  entityRank: 5,
                });
              }

              rawItems.push({
                id: `action-settle-summary-${a.id}`,
                title: `Settlement Clearing Sheet — "${a.code}"`,
                description: `Counterparty clearing balance sheet & reconciliation`,
                category: 'Reports',
                keywords: [a.code || '', a.name || '', 'settlement summary', 'clearing sheet'],
                icon: FileText,
                href: `/report-viewer?type=settlement-summary`,
                entityKind,
                entityRank: 6,
              });

              // Rank 10: Quick Action
              rawItems.push({
                id: `action-trade-${a.id}`,
                title: `Add Trade for "${a.code}"`,
                description: `Open new trade entry form for ${a.name}`,
                category: 'Actions',
                keywords: [a.code || '', a.name || '', 'add trade', 'new trade'],
                icon: Plus,
                href: `/trades?${isBroker ? 'brokerId' : 'clientId'}=${a.id}&action=add`,
                entityKind,
                entityRank: 10,
              });
            });
          }
        }

        if (scrRes.ok) {
          const scrs = await scrRes.json();
          if (Array.isArray(scrs)) {
            scrs.forEach((s: any) => {
              const code = s.shortName || s.symbol || '';
              const fullName = s.fullName || code;

              // Rank 1: Script Master Page
              rawItems.push({
                id: `script-${s.id}`,
                title: `${code} — ${fullName}`,
                description: `Script Master • Lot Size: ${s.lotSize || 1}`,
                category: 'Entities',
                keywords: [code, fullName, 'script'],
                icon: ScrollText,
                href: `/scripts?id=${s.id}`,
                entityKind: 'SCRIPT',
                entityRank: 1,
              });

              // Rank 2..4: Script Reports (no Invoice for Scripts)
              rawItems.push({
                id: `script-netpos-${s.id}`,
                title: `Net Position Report (Script) — "${code}"`,
                description: `Open market exposure & MTM across ${fullName}`,
                category: 'Reports',
                keywords: [code, fullName, 'net position', 'exposure'],
                icon: PieChart,
                href: `/report-viewer?type=net-position&groupBy=SCRIPT&scriptId=${s.id}`,
                entityKind: 'SCRIPT',
                entityRank: 2,
              });

              rawItems.push({
                id: `script-trades-${s.id}`,
                title: `Trades History — "${code}"`,
                description: `View all active and settled trades for ${fullName}`,
                category: 'Reports',
                keywords: [code, fullName, 'trades', 'orders'],
                icon: ArrowUpDown,
                href: `/trades?scriptId=${s.id}`,
                entityKind: 'SCRIPT',
                entityRank: 3,
              });

              rawItems.push({
                id: `script-rates-${s.id}`,
                title: `Closing Rates — "${code}"`,
                description: `Daily mark-to-market settlement prices for ${fullName}`,
                category: 'Reports',
                keywords: [code, fullName, 'closing rate', 'rates'],
                icon: Coins,
                href: `/closing-rates`,
                entityKind: 'SCRIPT',
                entityRank: 4,
              });
            });
          }
        }

        // Pre-index lowercased titles & keywords for 0ms keystroke scoring
        const indexed = rawItems.map((item) => ({
          ...item,
          lowerTitle: item.title.toLowerCase(),
          lowerKeywords: item.keywords.map((k) => k.toLowerCase()),
        }));

        setDynamicEntities(indexed);
      } catch (err) {
        console.error('Failed to load search entities:', err);
      }
    }

    loadEntities();
  }, []);

  // Initialize states cleanly when modal opens or mode switches
  useEffect(() => {
    if (isOpen) {
      setHoveredId(null);
      setKeyboardIndex(-1);
      setIsColumnDropdownOpen(false);

      if (mode === 'table') {
        // Persist existing search query & multi-field conditions from the active page!
        setTableInput(activeTable?.searchQuery || '');
        const existingConds = activeTable?.advancedConditions || [];
        setConditions(existingConds);
        setIsMultiFieldOpen(existingConds.some((c) => c.value?.trim()));
      } else {
        setAppInput('');
        setActiveTab('All');
      }

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]); // intentionally only re-run on open/mode change

  // Sync deferred table search string back to underlying page table (non-blocking)
  useEffect(() => {
    if (!isOpen || mode !== 'table' || !activeTable?.onSearchChange) return;
    if (tableInput === (activeTable.searchQuery || '')) return;

    const timer = setTimeout(() => {
      activeTable.onSearchChange(tableInput);
    }, 140);
    return () => clearTimeout(timer);
  }, [tableInput, isOpen, mode, activeTable]);

  // Outside click close for Columns Dropdown
  useEffect(() => {
    if (!isColumnDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isColumnDropdownOpen]);

  // Reset arrow key selection whenever query or tab changes (so ArrowDown always starts cleanly on Row 1!)
  useEffect(() => {
    setKeyboardIndex(-1);
    setHoveredId(null);
  }, [deferredAppQuery, deferredTableQuery, activeTab, mode]);

  // ── APP MODE (`Ctrl+K`) COMPUTATIONS ─────────────────────────────────
  const allAppItems = useMemo(() => {
    return [...INDEXED_STATIC_REGISTRY, ...dynamicEntities];
  }, [dynamicEntities]);

  const tabCounts = useMemo(() => {
    return {
      All: INDEXED_STATIC_REGISTRY.length,
      Pages: INDEXED_STATIC_REGISTRY.filter((i) => i.category === 'Pages').length,
      Actions: INDEXED_STATIC_REGISTRY.filter((i) => i.category === 'Actions').length,
      Reports: INDEXED_STATIC_REGISTRY.filter((i) => i.category === 'Reports').length,
      Entities: dynamicEntities.filter((i) => i.category === 'Entities').length,
      Shortcuts: INDEXED_STATIC_REGISTRY.filter((i) => i.category === 'Shortcuts').length,
    };
  }, [dynamicEntities]);

  const rankedAppItems = useMemo(() => {
    let items = allAppItems;
    if (activeTab !== 'All') {
      items = items.filter((i) => i.category === activeTab);
    }

    const q = deferredAppQuery.trim().toLowerCase();
    if (!q) {
      // When empty query, avoid dumping thousands of entity combinations; show crisp defaults
      if (activeTab === 'All') {
        return INDEXED_STATIC_REGISTRY;
      }
      if (activeTab === 'Entities') {
        return dynamicEntities.filter((i) => i.category === 'Entities').slice(0, 30);
      }
      return items.slice(0, 40);
    }

    const baseQ = q.endsWith('s') && q.length > 3 ? q.slice(0, -1) : q;
    const scored: { item: SearchItem; score: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const score = computeItemScore(item, q, baseQ);
      if (score > 0) {
        scored.push({ item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 45).map((s) => s.item);
  }, [allAppItems, dynamicEntities, activeTab, deferredAppQuery]);

  const appSections = useMemo(() => {
    const sections: { title: string; items: SearchItem[] }[] = [];

    if (!deferredAppQuery.trim()) {
      if (activeTab === 'Shortcuts') {
        sections.push({
          title: 'Keyboard Shortcuts',
          items: rankedAppItems,
        });
      } else if (activeTab === 'Entities') {
        sections.push({
          title: 'Clients, Brokers & Scripts',
          items: rankedAppItems,
        });
      } else if (activeTab !== 'All') {
        sections.push({
          title: activeTab,
          items: rankedAppItems,
        });
      } else {
        sections.push(
          { title: 'Core Pages', items: rankedAppItems.filter((i) => i.category === 'Pages').slice(0, 8) },
          { title: 'Quick Actions', items: rankedAppItems.filter((i) => i.category === 'Actions').slice(0, 6) },
          { title: 'Reports', items: rankedAppItems.filter((i) => i.category === 'Reports').slice(0, 6) },
          { title: 'Keyboard Shortcuts', items: rankedAppItems.filter((i) => i.category === 'Shortcuts') }
        );
      }
      return sections.filter((s) => s.items.length > 0);
    }

    const bestMatches = rankedAppItems.slice(0, 4);
    const bestIds = new Set(bestMatches.map((i) => i.id));
    const remainder = rankedAppItems.filter((i) => !bestIds.has(i.id));

    if (bestMatches.length > 0) {
      sections.push({ title: 'Best Matches', items: bestMatches });
    }

    const pages = remainder.filter((i) => i.category === 'Pages');
    if (pages.length > 0) sections.push({ title: 'Pages', items: pages });

    const reports = remainder.filter((i) => i.category === 'Reports');
    if (reports.length > 0) sections.push({ title: 'Reports & Statements', items: reports });

    const entities = remainder.filter((i) => i.category === 'Entities');
    if (entities.length > 0) sections.push({ title: 'Accounts & Scripts', items: entities.slice(0, 8) });

    const actions = remainder.filter((i) => i.category === 'Actions');
    if (actions.length > 0) sections.push({ title: 'Quick Actions', items: actions });

    const shortcuts = remainder.filter((i) => i.category === 'Shortcuts');
    if (shortcuts.length > 0) sections.push({ title: 'Shortcuts', items: shortcuts });

    return sections.filter((s) => s.items.length > 0);
  }, [rankedAppItems, deferredAppQuery, activeTab]);

  const flatAppItems = useMemo(() => appSections.flatMap((s) => s.items), [appSections]);

  // ── TABLE MODE (`Ctrl+F`) COMPUTATIONS ───────────────────────────────
  const displayCols = useMemo(() => {
    if (!activeTable?.columns || activeTable.columns.length === 0) return [];
    return activeTable.columns.slice(0, 4);
  }, [activeTable?.columns]);

  const hasSelectedSpecificCols = Boolean(
    (activeTable?.searchColumn && activeTable.searchColumn !== 'ALL' && activeTable.searchColumn.trim() !== '') ||
      (activeTable?.selectedColumns &&
        activeTable.selectedColumns.length > 0 &&
        !activeTable.selectedColumns.includes('ALL'))
  );

  const columnButtonLabel = useMemo(() => {
    if (!activeTable?.columns || !hasSelectedSpecificCols) return 'All Columns';
    if (
      activeTable.selectedColumns &&
      activeTable.selectedColumns.length > 0 &&
      !activeTable.selectedColumns.includes('ALL')
    ) {
      if (activeTable.selectedColumns.length === 1) {
        const col = activeTable.columns.find((c) => c.key === activeTable.selectedColumns![0]);
        return col ? col.label : '1 Column';
      }
      return `${activeTable.selectedColumns.length} Columns`;
    }
    if (activeTable.searchColumn && activeTable.searchColumn !== 'ALL') {
      const col = activeTable.columns.find((c) => c.key === activeTable.searchColumn);
      return col ? col.label : '1 Column';
    }
    return 'All Columns';
  }, [activeTable?.columns, activeTable?.selectedColumns, activeTable?.searchColumn, hasSelectedSpecificCols]);

  const filteredTableRows = useMemo(() => {
    const records = activeTable?.records || [];
    const columns = activeTable?.columns || [];
    const q = deferredTableQuery.trim().toLowerCase();
    const activeConditions = conditions.filter((c) => c.value && c.value.trim());

    if (records.length === 0) return [];

    if (!q && activeConditions.length === 0) {
      return records.slice(0, 15).map((record) => ({
        record,
        matchedColumn: null as { key: string; label: string; value: string } | null,
      }));
    }

    let targetCols = columns;
    if (
      activeTable?.selectedColumns &&
      activeTable.selectedColumns.length > 0 &&
      !activeTable.selectedColumns.includes('ALL')
    ) {
      targetCols = columns.filter((c) => activeTable.selectedColumns?.includes(c.key));
    } else if (activeTable?.searchColumn && activeTable.searchColumn !== 'ALL') {
      targetCols = columns.filter((c) => c.key === activeTable.searchColumn);
    }

    const terms = q ? q.split(/[,\s]+/).filter(Boolean) : [];
    const results: { record: any; matchedColumn: { key: string; label: string; value: string } | null }[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      let matchedColInfo: { key: string; label: string; value: string } | null = null;
      let textMatchPassed = terms.length === 0;

      if (terms.length > 0) {
        const candidateEntries: { key: string; label: string; value: string }[] = [];
        for (const col of targetCols) {
          const val = String(getRecordValue(record, col.key) ?? '').trim();
          if (val) candidateEntries.push({ key: col.key, label: col.label, value: val });
        }

        if (!hasSelectedSpecificCols) {
          const deepStrings = getAllSearchableStrings(record);
          for (const ds of deepStrings) {
            candidateEntries.push(ds);
          }
        }

        if (searchMatchMode === 'AND') {
          const termMatches = terms.map((term) =>
            candidateEntries.find((entry) => entry.value.toLowerCase().includes(term))
          );
          if (termMatches.every(Boolean)) {
            textMatchPassed = true;
            if (termMatches[0]) {
              matchedColInfo = termMatches[0];
            }
          }
        } else {
          for (const entry of candidateEntries) {
            const lower = entry.value.toLowerCase();
            if (terms.some((t) => lower.includes(t))) {
              textMatchPassed = true;
              matchedColInfo = entry;
              break;
            }
          }
        }
      }

      let conditionMatchPassed = true;
      if (activeConditions.length > 0) {
        activeConditions.forEach((c, idx) => {
          const rawVal = getRecordValue(record, c.column);
          const valStr = String(rawVal ?? '').toLowerCase();
          const targetStr = c.value.toLowerCase().trim();

          let passed = false;
          if (c.operator === 'equals') passed = valStr === targetStr;
          else if (c.operator === 'starts_with') passed = valStr.startsWith(targetStr);
          else passed = valStr.includes(targetStr);

          if (idx === 0) conditionMatchPassed = passed;
          else conditionMatchPassed = c.conjunction === 'OR' ? conditionMatchPassed || passed : conditionMatchPassed && passed;

          if (passed && !matchedColInfo) {
            const colDef = columns.find((col) => col.key === c.column);
            matchedColInfo = {
              key: c.column,
              label: colDef?.label || c.column,
              value: String(rawVal ?? ''),
            };
          }
        });
      }

      if (textMatchPassed && conditionMatchPassed) {
        results.push({ record, matchedColumn: matchedColInfo });
        if (results.length >= 30) break;
      }
    }

    return results;
  }, [
    activeTable?.records,
    activeTable?.columns,
    activeTable?.searchColumn,
    activeTable?.selectedColumns,
    hasSelectedSpecificCols,
    deferredTableQuery,
    searchMatchMode,
    conditions,
  ]);

  // ── ACTION HANDLERS ──────────────────────────────────────────────────
  const handleSelectAppItem = useCallback(
    (item: SearchItem) => {
      closeModal();
      if (item.action) {
        item.action();
      } else if (item.href) {
        if (item.isExternalTab) {
          window.open(item.href, '_blank');
        } else {
          router.push(item.href);
        }
      }
    },
    [closeModal, router]
  );

  const handleApplyTableAndClose = useCallback(
    (selectedRecord?: any) => {
      if (activeTable) {
        activeTable.onSearchChange(tableInput);
        if (activeTable.onAdvancedConditionsChange) {
          activeTable.onAdvancedConditionsChange(conditions.filter((c) => c.value?.trim()));
        }
        if (selectedRecord && activeTable.onSelectRow) {
          activeTable.onSelectRow(selectedRecord);
        }
      }
      closeModal();
    },
    [activeTable, tableInput, conditions, closeModal]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const listLen = mode === 'table' ? filteredTableRows.length : flatAppItems.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoveredId(null);
      if (listLen === 0) return;
      setKeyboardIndex((prev) => (prev < listLen - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoveredId(null);
      if (listLen === 0) return;
      setKeyboardIndex((prev) => (prev <= 0 ? listLen - 1 : prev - 1));
    } else if (e.key === 'Tab' && activeTable) {
      e.preventDefault();
      setMode(mode === 'app' ? 'table' : 'app');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'table') {
        if (keyboardIndex >= 0 && filteredTableRows[keyboardIndex]) {
          handleApplyTableAndClose(filteredTableRows[keyboardIndex].record);
        } else {
          // Pressed Enter while typing directly -> apply query string to table filter
          handleApplyTableAndClose();
        }
      } else {
        const targetIndex = keyboardIndex >= 0 ? keyboardIndex : 0;
        if (flatAppItems[targetIndex]) {
          handleSelectAppItem(flatAppItems[targetIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  let currentAppCounter = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-start justify-center pt-[8vh] sm:pt-[11vh] px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={closeModal}
    >
      <div
        className={cn(
          'w-full flex flex-col p-0 overflow-hidden shadow-[0_24px_60px_rgba(15,23,42,0.18)] border border-slate-200/90 bg-white rounded-2xl animate-in zoom-in-95 duration-150 max-h-[84vh]',
          mode === 'table' ? 'max-w-3xl' : 'max-w-2xl sm:max-w-3xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── SEARCH INPUT BAR ───────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-200/80 bg-white shrink-0">
          <Search className="w-5 h-5 text-[#2652C8] shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={mode === 'table' ? tableInput : appInput}
            onChange={(e) => {
              const v = e.target.value;
              if (mode === 'table') setTableInput(v);
              else setAppInput(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'table'
                ? 'Search data on this page...'
                : 'App-wide search... (pages, clients, brokers, scripts, reports, shortcuts)'
            }
            className="w-full text-sm font-medium bg-transparent text-slate-900 placeholder:text-slate-400 outline-none caret-[#2652C8]"
          />

          {/* Clear Input */}
          {(mode === 'table' ? tableInput : appInput) && (
            <button
              type="button"
              onClick={() => {
                if (mode === 'table') {
                  setTableInput('');
                  activeTable?.onSearchChange('');
                } else {
                  setAppInput('');
                }
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Mode-Specific Header Controls */}
          {mode === 'table' && activeTable ? (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* AND / OR Match Mode */}
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/90 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSearchMatchMode('OR')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                    searchMatchMode === 'OR'
                      ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="OR: Match ANY typed term"
                >
                  OR
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMatchMode('AND')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer',
                    searchMatchMode === 'AND'
                      ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="AND: Match ALL typed terms"
                >
                  AND
                </button>
              </div>

              {/* Column Picker Dropdown */}
              {activeTable.columns && activeTable.columns.length > 0 && (
                <div className="relative" ref={columnDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
                    className={cn(
                      'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer',
                      hasSelectedSpecificCols
                        ? 'bg-blue-50 text-[#2652C8] border-blue-200 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                    title="Target specific columns"
                  >
                    <span className="max-w-[110px] truncate">{columnButtonLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isColumnDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-68 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Target Columns
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            activeTable.onSearchColumnChange?.('ALL');
                            activeTable.onSelectedColumnsChange?.(['ALL']);
                          }}
                          className="text-[11px] text-[#2652C8] hover:underline font-semibold cursor-pointer"
                        >
                          All Columns
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          activeTable.onSearchColumnChange?.('ALL');
                          activeTable.onSelectedColumnsChange?.(['ALL']);
                          setIsColumnDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left',
                          !hasSelectedSpecificCols
                            ? 'bg-blue-50 text-[#2652C8]'
                            : 'hover:bg-slate-50 text-slate-700'
                        )}
                      >
                        <span>All Columns</span>
                        {!hasSelectedSpecificCols && <Check className="w-3.5 h-3.5 text-[#2652C8]" />}
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <div className="space-y-0.5">
                        {activeTable.columns.map((col) => {
                          const isChecked =
                            hasSelectedSpecificCols &&
                            (activeTable.searchColumn === col.key ||
                              activeTable.selectedColumns?.includes(col.key));
                          return (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => {
                                if (activeTable.selectedColumns && activeTable.onSelectedColumnsChange) {
                                  const current = activeTable.selectedColumns.filter((k) => k !== 'ALL');
                                  const exists = current.includes(col.key);
                                  const next = exists
                                    ? current.filter((k) => k !== col.key)
                                    : [...current, col.key];
                                  if (next.length === 0) {
                                    activeTable.onSelectedColumnsChange(['ALL']);
                                    activeTable.onSearchColumnChange?.('ALL');
                                  } else {
                                    activeTable.onSelectedColumnsChange(next);
                                    activeTable.onSearchColumnChange?.(next[0]);
                                  }
                                } else {
                                  const nextCol = activeTable.searchColumn === col.key ? 'ALL' : col.key;
                                  activeTable.onSearchColumnChange?.(nextCol);
                                }
                              }}
                              className={cn(
                                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer text-left',
                                isChecked
                                  ? 'bg-blue-50/70 text-[#2652C8] font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              )}
                            >
                              <span className="truncate">{col.label}</span>
                              {isChecked && <Check className="w-3.5 h-3.5 text-[#2652C8] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Column Query Builder Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isMultiFieldOpen;
                  setIsMultiFieldOpen(next);
                  if (next && conditions.length === 0 && activeTable.columns?.length) {
                    setConditions([
                      {
                        id: Math.random().toString(36).slice(2, 8),
                        column: activeTable.columns[0].key,
                        operator: 'contains',
                        value: '',
                        conjunction: 'AND',
                      },
                    ]);
                  }
                }}
                className={cn(
                  'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer',
                  isMultiFieldOpen || conditions.some((c) => c.value?.trim())
                    ? 'bg-blue-50 text-[#2652C8] border-blue-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                )}
                title="Multi-Column Search (different words in specific columns)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Multi-Col</span>
                {conditions.filter((c) => c.value?.trim()).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#2652C8] text-white text-[10px] font-bold">
                    {conditions.filter((c) => c.value?.trim()).length}
                  </span>
                )}
              </button>
            </div>
          ) : (
            activeTable && (
              <button
                type="button"
                onClick={() => setMode('table')}
                className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-[#2652C8] border border-blue-200/80 transition-colors cursor-pointer shrink-0"
                title={`Switch to searching ${activeTable.tableName} (Tab)`}
              >
                <span>{activeTable.tableName}</span>
                <kbd className="font-mono text-[10px] bg-white px-1 rounded border border-blue-200">Tab</kbd>
              </button>
            )
          )}
        </div>

        {/* ── MODE 1: TABLE DATA SEARCH (`Ctrl+F`) ────────────────────── */}
        {mode === 'table' && activeTable ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Multi-Column Query Builder Panel */}
            {isMultiFieldOpen && (
              <div className="px-5 py-3 bg-blue-50/40 border-b border-blue-100 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <span>Multi-Column Filter Conditions</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTable.columns?.length) {
                          setConditions((prev) => [
                            ...prev,
                            {
                              id: Math.random().toString(36).slice(2, 8),
                              column: activeTable.columns[0].key,
                              operator: 'contains',
                              value: '',
                              conjunction: 'AND',
                            },
                          ]);
                        }
                      }}
                      className="text-[#2652C8] hover:underline font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Condition</span>
                    </button>
                    {conditions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setConditions([]);
                          activeTable.onAdvancedConditionsChange?.([]);
                        }}
                        className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {conditions.map((cond, idx) => (
                    <div key={cond.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {idx > 0 ? (
                        <select
                          value={cond.conjunction}
                          onChange={(e) => {
                            const val = e.target.value as 'AND' | 'OR';
                            setConditions((prev) =>
                              prev.map((c) => (c.id === cond.id ? { ...c, conjunction: val } : c))
                            );
                          }}
                          className="h-8 px-2 bg-blue-50 text-[#2652C8] font-bold text-xs rounded-lg border border-blue-200 outline-none cursor-pointer"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      ) : (
                        <span className="w-12 text-[11px] font-bold text-slate-500 uppercase pl-1 shrink-0">
                          Where
                        </span>
                      )}

                      <select
                        value={cond.column}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, column: val } : c))
                          );
                        }}
                        className="h-8 px-2.5 bg-white text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 outline-none cursor-pointer max-w-[160px]"
                      >
                        {activeTable.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, operator: val } : c))
                          );
                        }}
                        className="h-8 px-2 bg-white text-slate-600 text-xs font-medium rounded-lg border border-slate-200 outline-none cursor-pointer"
                      >
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="starts_with">starts with</option>
                      </select>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, value: val } : c))
                          );
                        }}
                        placeholder="Value..."
                        className="h-8 px-3 flex-1 min-w-[120px] bg-white text-slate-900 text-xs font-medium rounded-lg border border-slate-200 outline-none focus:border-[#2652C8]"
                      />

                      <button
                        type="button"
                        onClick={() => setConditions((prev) => prev.filter((c) => c.id !== cond.id))}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        title="Remove condition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Multi-Column Table Preview */}
            <div className="flex-1 overflow-y-auto">
              {filteredTableRows.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200">
                    <tr>
                      {displayCols.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                      {tableInput.trim() && (
                        <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Matched In
                        </th>
                      )}
                      <th className="w-20 px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTableRows.map((row, idx) => {
                      const rowId = row.record.id || String(idx);
                      const isSelected = hoveredId === rowId || (hoveredId === null && keyboardIndex === idx);

                      return (
                        <tr
                          key={rowId}
                          onClick={() => handleApplyTableAndClose(row.record)}
                          onMouseEnter={() => setHoveredId(rowId)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={cn(
                            'transition-colors cursor-pointer group',
                            isSelected ? 'bg-blue-50/80 text-slate-950' : 'hover:bg-slate-50/80'
                          )}
                        >
                          {displayCols.map((col, colIdx) => {
                            const val = String(getRecordValue(row.record, col.key) ?? '') || '—';
                            return (
                              <td
                                key={col.key}
                                className={cn(
                                  'px-4 py-2.5 truncate max-w-[190px]',
                                  colIdx === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'
                                )}
                              >
                                {highlightMatch(val, deferredTableQuery)}
                              </td>
                            );
                          })}

                          {tableInput.trim() && (
                            <td className="px-4 py-2.5 truncate max-w-[200px]">
                              {row.matchedColumn ? (
                                <div className="inline-flex items-center gap-1.5 max-w-full">
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2652C8] border border-blue-200/80">
                                    {row.matchedColumn.label}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-700 truncate">
                                    {highlightMatch(row.matchedColumn.value, deferredTableQuery)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          )}

                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2652C8] text-white text-[10px] font-bold shadow-2xs">
                                <span>Select</span>
                                <span className="font-mono">↵</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-300 opacity-0 group-hover:opacity-100 font-semibold">
                                Open →
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-14 px-6 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    No matching records in {activeTable.tableName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Try adjusting keywords, switching AND/OR mode, or selecting &ldquo;All Columns&rdquo;.
                  </p>
                </div>
              )}
            </div>

            {/* Table Mode Footer */}
            <div className="px-5 py-2.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑↓</kbd>{' '}
                  Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↵</kbd>{' '}
                  Apply Filter / Open Row
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Tab</kbd>{' '}
                  App Search
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Esc</kbd>{' '}
                  Close
                </span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <span>
                  {filteredTableRows.length} shown ({activeTable.records?.length || 0} total)
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyTableAndClose()}
                  className="ml-2 px-2.5 py-1 rounded-lg bg-[#2652C8] hover:bg-[#1F42A3] text-white text-[11px] font-bold cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── MODE 2: APP-WIDE SEARCH (`Ctrl+K`) ─────────────────────── */
          <>
            {/* Bright Executive Light-Theme Navigation Tabs (including Shortcuts!) */}
            <div className="flex items-center gap-1 px-5 pt-2 border-b border-slate-200/80 bg-slate-50/50 overflow-x-auto select-none shrink-0">
              {(['All', 'Pages', 'Actions', 'Reports', 'Entities', 'Shortcuts'] as MainCategoryTab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
                      isActive
                        ? 'text-[#2652C8] border-[#2652C8] bg-white shadow-2xs'
                        : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/70'
                    )}
                  >
                    <span>{tab}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded text-[10px] font-mono font-bold',
                        isActive ? 'bg-blue-50 text-[#2652C8]' : 'bg-slate-200/70 text-slate-600'
                      )}
                    >
                      {tabCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grouped Results List */}
            <div
              onMouseLeave={() => setHoveredId(null)}
              className="flex-1 overflow-y-auto p-3 space-y-4 bg-white"
            >
              {appSections.length === 0 ? (
                <div className="py-14 px-6 text-center text-slate-400 text-xs">
                  No matching pages, reports, entities, or shortcuts found for{' '}
                  <strong className="text-slate-700">&ldquo;{appInput}&rdquo;</strong>
                </div>
              ) : (
                appSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        {section.title === 'Best Matches' && <Sparkles className="w-3.5 h-3.5 text-[#2652C8]" />}
                        <span>{section.title}</span>
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {section.items.length}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const itemIndex = currentAppCounter++;
                        const isSelected =
                          hoveredId === item.id || (hoveredId === null && keyboardIndex === itemIndex);
                        const isImplicitDefault =
                          hoveredId === null && keyboardIndex === -1 && itemIndex === 0 && Boolean(deferredAppQuery.trim());
                        const IconComp = item.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectAppItem(item)}
                            onMouseEnter={() => setHoveredId(item.id)}
                            className={cn(
                              'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-all duration-75 group',
                              isSelected || isImplicitDefault
                                ? 'bg-blue-50/75 text-slate-900 ring-1 ring-blue-200/90 shadow-2xs'
                                : 'hover:bg-slate-50 text-slate-700'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  'w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
                                  item.category === 'Actions'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                    : item.category === 'Reports'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200/80'
                                    : item.category === 'Entities'
                                    ? 'bg-blue-50 text-[#1D4ED8] border-blue-200/80'
                                    : item.category === 'Shortcuts'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200/80'
                                    : 'bg-blue-50/70 text-[#2652C8] border-blue-200/70'
                                )}
                              >
                                <IconComp className="w-4 h-4 stroke-[2]" />
                              </div>

                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                                  {highlightMatch(item.title, deferredAppQuery)}
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {item.shortcut ? (
                                <kbd className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-mono font-bold text-[11px] shadow-2xs">
                                  {item.shortcut}
                                </kbd>
                              ) : isSelected || isImplicitDefault ? (
                                <span className="px-2 py-0.5 rounded-md bg-[#2652C8] text-white font-bold text-[10px] shadow-2xs flex items-center gap-1">
                                  <span>Open</span>
                                  <span className="font-mono">↵</span>
                                </span>
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* App Mode Footer */}
            <div className="px-5 py-2.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 select-none shrink-0">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑↓</kbd>{' '}
                  Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↵</kbd>{' '}
                  Open
                </span>
                {activeTable && (
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Tab</kbd>{' '}
                    Page Filter
                  </span>
                )}
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Esc</kbd>{' '}
                  Close
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                BizzMate Command Center
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
