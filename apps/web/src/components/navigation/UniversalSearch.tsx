'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  TableProperties,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTableSearch } from '@/context/TableSearchContext';
import { apiFetch } from '@/utils/apiClient';

export type MainCategoryTab = 'All' | 'Pages' | 'Actions' | 'Reports' | 'Entities' | 'On Page';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: 'Pages' | 'Actions' | 'Reports' | 'Entities' | 'TableRows' | 'Shortcuts';
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string;
  isExternalTab?: boolean;
  tableRowData?: any;
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
    keywords: ['closing rates', 'rates', 'cmp', 'market price', 'settlement price', 'daily rates'],
    icon: Coins,
    href: '/closing-rates',
  },
  {
    id: 'page-trade-import',
    title: 'Trade Import Wizard',
    description: 'Dynamic CSV / Excel trade transaction import wizard with flexible column mapping',
    category: 'Pages',
    keywords: ['import', 'upload', 'csv', 'excel', 'trades import', 'upload trades', 'trade wizard'],
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

  // ── Pages: Financial Reports & Statements ─────────────────────────
  {
    id: 'report-net-position',
    title: 'Net Position Report',
    description: 'Open market positions, contract quantities, closing rates, and MTM valuations',
    category: 'Reports',
    keywords: ['net position', 'open position', 'mtm', 'exposure', 'positions', 'contracts', 'unrealized pnl'],
    icon: PieChart,
    href: '/reports/net-position',
  },
  {
    id: 'report-invoices',
    title: 'Client & Broker Invoices',
    description: 'Bilateral settled contract invoices and futures billing statements',
    category: 'Reports',
    keywords: ['invoice', 'invoices', 'bill', 'billing', 'statement', 'contract note'],
    icon: FileText,
    href: '/reports/invoice',
  },
  {
    id: 'report-settlement-detail',
    title: 'Settlement Audit Report',
    description: 'Trade provenance categorized into Regular, Carry Forward, Back Forward, and Settlement',
    category: 'Reports',
    keywords: ['settlement audit', 'trade provenance', 'carry forward', 'back forward', 'audit report'],
    icon: ScrollText,
    href: '/reports/settlement-detail',
  },
  {
    id: 'report-settlement-summary',
    title: 'Settlement Summary (Reconciliation)',
    description: 'Firm-wide counterparty reconciliation, clearing balance sheet, and imbalance audits',
    category: 'Reports',
    keywords: ['settlement summary', 'reconciliation', 'clearing sheet', 'balance sheet', 'settlement balance'],
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
    keywords: ['ledger', 'account statement', 'transactions', 'journal', 'running balance', 'debit credit'],
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
    description: 'Configure trading exchange venues (NSE, MCX, BSE, GIFT-NIFTY)',
    category: 'Pages',
    keywords: ['exchange', 'exchanges', 'nse', 'mcx', 'bse', 'market venue'],
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

  // ── Reports & Document Viewer Actions ─────────────────────────────
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
];

function getRecordValue(record: any, key: string): any {
  if (!record || !key) return '';

  if (record[key] !== undefined && record[key] !== null) {
    if (typeof record[key] === 'object') {
      return (
        record[key].code ||
        record[key].name ||
        record[key].shortName ||
        record[key].symbol ||
        record[key].label ||
        ''
      );
    }
    return record[key];
  }

  if (key.includes('.')) {
    const parts = key.split('.');
    let cur = record;
    for (const p of parts) {
      if (cur == null) return '';
      cur = cur[p];
    }
    return cur ?? '';
  }

  if (key === 'client' || key === 'account') {
    const code = record.account?.code || record.clientCode || '';
    const name = record.account?.name || record.clientName || record.client || '';
    if (code && name) return `${code} - ${name}`;
    return code || name;
  }
  if (key === 'broker') {
    const code = record.broker?.code || record.brokerCode || '';
    const name = record.broker?.name || record.brokerName || '';
    if (code && name) return `${code} - ${name}`;
    return code || name;
  }
  if (key === 'securityName' || key === 'script' || key === 'symbol') {
    const short = record.script?.shortName || record.symbol || '';
    const name = record.script?.name || '';
    if (record.securityName) return record.securityName;
    if (short && name) return `${short} - ${name}`;
    return short || name;
  }
  if (key === 'tradeDate' || key === 'date') {
    return record.tradeDate || record.date || record.normalizedDate || '';
  }
  return '';
}

function getAllSearchableStrings(record: any): { key: string; label: string; value: string }[] {
  const entries: { key: string; label: string; value: string }[] = [];
  if (!record || typeof record !== 'object') return entries;

  for (const [k, v] of Object.entries(record)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      entries.push({ key: k, label: k, value: String(v) });
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      for (const [subK, subV] of Object.entries(v as any)) {
        if (typeof subV === 'string' || typeof subV === 'number') {
          entries.push({ key: `${k}.${subK}`, label: `${k} ${subK}`, value: String(subV) });
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
      <mark key={i} className="bg-amber-100 text-amber-950 font-bold px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ── Item Ranking & Scoring Engine ──────────────────────────────────────
function computeItemScore(item: SearchItem, query: string): number {
  if (!query.trim()) return 0;
  const q = query.toLowerCase().trim();
  const baseQ = q.endsWith('s') && q.length > 3 ? q.slice(0, -1) : q; // e.g. "trades" -> "trade", "clients" -> "client"
  const title = item.title.toLowerCase();
  const keywords = item.keywords.map((k) => k.toLowerCase());

  // Entity-specific actions (e.g. Add Trade for ELE01, Net Position for ELE01):
  // MUST ONLY match if query matches the account code or name! Never match generic words like "trade" or "report".
  const isEntitySpecificAction =
    item.id.startsWith('action-trade-') ||
    item.id.startsWith('action-netpos-') ||
    item.id.startsWith('action-invoice-') ||
    item.id.startsWith('action-settle-') ||
    item.id.startsWith('action-ledger-') ||
    item.id.startsWith('entity-');

  if (isEntitySpecificAction) {
    const matchesEntity = keywords.some(
      (kw) => kw === q || kw === baseQ || kw.startsWith(q) || kw.includes(q)
    );
    if (!matchesEntity) {
      return 0; // Filter out completely when user is searching generic words like "trade", "reports", etc.
    }
    // High boost for matched entity code/name
    let entityScore = 3000;
    if (keywords.some((kw) => kw === q || kw === baseQ)) {
      entityScore += 5000; // Exact code match (e.g. "ele01")
    } else if (keywords.some((kw) => kw.startsWith(q))) {
      entityScore += 2500;
    }
    if (item.category === 'Entities') entityScore += 1000; // Profile jump first
    return entityScore;
  }

  // 1. PINNED CANONICAL ROUTING: Exact query intent for global features
  if (baseQ === 'trade') {
    if (item.id === 'page-trades') return 10000; // #1: Trades Page
    if (item.id === 'action-add-trade') return 9000; // #2: Add New Trade
    if (item.id === 'page-trade-import') return 8000; // #3: Trade Import Wizard
  }
  if (baseQ === 'client') {
    if (item.id === 'page-clients') return 10000; // #1: Clients Master
    if (item.id === 'action-add-client') return 9000; // #2: Add New Client
  }
  if (baseQ === 'broker') {
    if (item.id === 'page-brokers') return 10000; // #1: Brokers Master
    if (item.id === 'action-add-broker') return 9000; // #2: Add New Broker
  }
  if (baseQ === 'settle' || baseQ === 'settlement') {
    if (item.id === 'page-settlement') return 10000; // #1: Settlement Operations
    if (item.id === 'report-settlement-summary') return 9000; // #2: Settlement Summary
    if (item.id === 'report-settlement-detail') return 8000; // #3: Settlement Audit
  }
  if (baseQ === 'net position' || baseQ === 'open position') {
    if (item.id === 'report-net-position') return 10000;
    if (item.id === 'action-view-netpos') return 9000;
  }

  let score = 0;

  // 2. Exact Title Match or Singular/Plural Match
  if (title === q || title === baseQ || title === baseQ + 's') {
    score += 4000;
  } else if (title.startsWith(q) || title.startsWith(baseQ)) {
    score += 2000;
  } else if (title.includes(q)) {
    score += 700;
  }

  // 3. Word Boundary in Title
  const titleWords = title.split(/[\s-]+/);
  if (titleWords.some((w) => w === q || w === baseQ || w === baseQ + 's')) {
    score += 1500;
  } else if (titleWords.some((w) => w.startsWith(q))) {
    score += 600;
  }

  // 4. Keyword Matches
  for (const kw of keywords) {
    if (kw === q || kw === baseQ) {
      score = Math.max(score, 3000);
    } else if (kw.startsWith(q)) {
      score = Math.max(score, 1200);
    } else if (kw.includes(q) && q.length >= 3) {
      score = Math.max(score, 500);
    }
  }

  // 5. Category Priority Weights
  if (item.category === 'Pages') score += 500;
  else if (item.category === 'Actions') score += 350;
  else if (item.category === 'Reports') score += 250;

  return score;
}

export function UniversalSearch() {
  const { isOpen, mode, closeModal, activeTable } = useTableSearch();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MainCategoryTab>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(0);

  // Table Match Mode: DEFAULT TO 'OR' AS SPECIFIED BY USER
  const [searchMatchMode, setSearchMatchMode] = useState<'AND' | 'OR'>('OR');

  // Dynamic counterparty accounts loaded for deep contextual actions
  const [dynamicEntities, setDynamicEntities] = useState<SearchItem[]>([]);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch accounts & scripts on mount to enable rich deep entity search
  useEffect(() => {
    async function loadEntities() {
      try {
        const [accRes, scrRes] = await Promise.all([
          apiFetch('/account-masters'),
          apiFetch('/scripts'),
        ]);

        const items: SearchItem[] = [];

        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs)) {
            accs.forEach((a: any) => {
              const isBroker = a.group?.name?.toUpperCase()?.includes('BROKER');
              const roleLabel = isBroker ? 'Broker' : 'Client';

              // 1. Direct Entity Navigation Jump
              items.push({
                id: `entity-${a.id}`,
                title: `${a.code} - ${a.name}`,
                description: `${roleLabel} Master Profile | Ledger balance & KYC`,
                category: 'Entities',
                keywords: [a.code, a.name, roleLabel.toLowerCase()],
                icon: isBroker ? ShieldCheck : Users,
                href: isBroker ? `/brokers?id=${a.id}` : `/clients?id=${a.id}`,
              });

              // 2. Net Position Deep Action for Entity
              items.push({
                id: `action-netpos-${a.id}`,
                title: `Net Position Report for "${a.code} - ${a.name}"`,
                description: `Open positions and MTM valuations in Report Viewer`,
                category: 'Reports',
                keywords: [a.code, a.name, 'net position', 'open position'],
                icon: PieChart,
                href: `/report-viewer?type=net-position&entityId=${a.id}&groupBy=CLIENT`,
              });

              // 3. Invoice Statement Deep Action for Entity
              items.push({
                id: `action-invoice-${a.id}`,
                title: `Invoice Statement for "${a.code} - ${a.name}"`,
                description: `Bilateral settlement contract notes and bill in Report Viewer`,
                category: 'Reports',
                keywords: [a.code, a.name, 'invoice', 'bill', 'statement'],
                icon: FileText,
                href: `/report-viewer?type=invoice&entityType=${isBroker ? 'BROKER' : 'CLIENT'}&entityId=${a.id}`,
              });

              // 4. Settlement Audit Deep Action for Entity
              items.push({
                id: `action-settle-audit-${a.id}`,
                title: `Settlement Audit for "${a.code} - ${a.name}"`,
                description: `Trade provenance categorized for this ${roleLabel.toLowerCase()}`,
                category: 'Reports',
                keywords: [a.code, a.name, 'settlement audit', 'settlement', 'audit'],
                icon: ScrollText,
                href: `/report-viewer?type=settlement-detail&clientId=${a.id}`,
              });

              // 5. Settlement Summary Sheet Action
              items.push({
                id: `action-settle-summary-${a.id}`,
                title: `Settlement Clearing Sheet for "${a.code} - ${a.name}"`,
                description: `Counterparty clearing balance sheet and reconciliation`,
                category: 'Reports',
                keywords: [a.code, a.name, 'clearing sheet', 'settlement summary'],
                icon: FileText,
                href: `/report-viewer?type=settlement-summary`,
              });

              // 6. Ledger Statement Deep Action for Entity
              items.push({
                id: `action-ledger-${a.id}`,
                title: `Ledger Statement for "${a.code} - ${a.name}"`,
                description: `Financial accounting transactions and debit/credit ledger`,
                category: 'Reports',
                keywords: [a.code, a.name, 'ledger', 'statement'],
                icon: BookText,
                href: `/ledger?accountId=${a.id}`,
              });

              // 7. Add Trade for Entity
              items.push({
                id: `action-trade-${a.id}`,
                title: `Add Trade for "${a.code} - ${a.name}"`,
                description: `Pre-fill trade entry form for this ${roleLabel.toLowerCase()}`,
                category: 'Actions',
                keywords: [a.code, a.name, 'add trade', 'new trade'],
                icon: Plus,
                href: `/trades?action=add&clientId=${a.id}`,
              });
            });
          }
        }

        if (scrRes.ok) {
          const scrs = await scrRes.json();
          if (Array.isArray(scrs)) {
            scrs.forEach((s: any) => {
              items.push({
                id: `script-${s.id}`,
                title: `Script: ${s.shortName || s.symbol} (${s.fullName || 'Security'})`,
                description: `Market Lot: ${s.marketLot || s.lotSize || 1} | Security Master`,
                category: 'Entities',
                keywords: [s.shortName || '', s.symbol || '', s.fullName || ''],
                icon: ScrollText,
                href: `/scripts?id=${s.id}`,
              });
            });
          }
        }

        setDynamicEntities(items);
      } catch (err) {
        console.error('Failed to load search entities:', err);
      }
    }

    loadEntities();
  }, []);

  // Focus input whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveTab('All');
      setHoveredId(null);
      setKeyboardIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Combine static and dynamic items
  const allSearchItems = useMemo(() => {
    return [...STATIC_REGISTRY, ...dynamicEntities];
  }, [dynamicEntities]);

  // Ranked and prioritized search items
  const rankedItems = useMemo(() => {
    let items = allSearchItems;

    if (activeTab === 'Pages') items = items.filter((i) => i.category === 'Pages');
    else if (activeTab === 'Actions') items = items.filter((i) => i.category === 'Actions');
    else if (activeTab === 'Reports') items = items.filter((i) => i.category === 'Reports');
    else if (activeTab === 'Entities') items = items.filter((i) => i.category === 'Entities');

    if (!query.trim()) {
      return items;
    }

    const scored = items
      .map((item) => ({
        item,
        score: computeItemScore(item, query),
      }))
      .filter((entry) => entry.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item);
  }, [allSearchItems, query, activeTab]);

  // Filter Active Table Records (Matches user query in real-time)
  const filteredTableRows = useMemo(() => {
    if (!activeTable?.records || activeTable.records.length === 0) return [];

    const searchQuery = query.trim();
    if (!searchQuery) {
      if (mode === 'table') {
        return activeTable.records.slice(0, 15).map((r, idx) => ({
          record: r,
          index: idx,
          matchedValue: '',
        }));
      }
      return [];
    }

    const terms = searchQuery
      .toLowerCase()
      .split(/[,\s]+/)
      .filter(Boolean);

    const matches: { record: any; index: number; matchedValue: string }[] = [];

    for (let i = 0; i < activeTable.records.length; i++) {
      const record = activeTable.records[i];
      const allStrings = getAllSearchableStrings(record);

      let isMatch = false;
      let matchedVal = '';

      if (searchMatchMode === 'AND') {
        const termMatches = terms.map((t) => allStrings.find((e) => e.value.toLowerCase().includes(t)));
        isMatch = termMatches.every(Boolean);
        if (isMatch && termMatches[0]) {
          matchedVal = termMatches[0].value;
        }
      } else {
        // Default OR Mode
        const hit = allStrings.find((e) => terms.some((t) => e.value.toLowerCase().includes(t)));
        if (hit) {
          isMatch = true;
          matchedVal = hit.value;
        }
      }

      if (isMatch) {
        matches.push({ record, index: i, matchedValue: matchedVal });
        if (matches.length >= 20) break;
      }
    }

    return matches;
  }, [activeTable?.records, query, searchMatchMode, mode]);

  // Map Table Rows into SearchItem representations
  const tableSearchItems = useMemo((): SearchItem[] => {
    if (!activeTable || filteredTableRows.length === 0) return [];

    return filteredTableRows.map(({ record, index, matchedValue }) => {
      const clientStr = getRecordValue(record, 'client') || getRecordValue(record, 'account');
      const scriptStr = getRecordValue(record, 'securityName') || getRecordValue(record, 'script') || getRecordValue(record, 'name');
      const dateStr = getRecordValue(record, 'tradeDate') || getRecordValue(record, 'date');
      const qtyStr = record.quantity !== undefined ? String(record.quantity) : '';
      const rateStr = record.rate !== undefined ? String(record.rate) : '';

      const titleParts = [clientStr, scriptStr].filter(Boolean);
      const title = titleParts.length > 0 ? titleParts.join(' · ') : `Row #${index + 1}`;

      const descParts = [dateStr, qtyStr ? `Qty: ${qtyStr}` : '', rateStr ? `Rate: ${rateStr}` : '', matchedValue ? `Match: ${matchedValue}` : ''].filter(Boolean);
      const description = descParts.join(' | ') || `${activeTable.tableName} Record`;

      return {
        id: `tablerow-${index}`,
        title,
        description,
        category: 'TableRows',
        keywords: [title, description, matchedValue],
        icon: TableProperties,
        tableRowData: record,
        action: () => {
          if (activeTable.onSelectRow) {
            activeTable.onSelectRow(record);
          } else if (matchedValue) {
            activeTable.onSearchChange(matchedValue);
          }
          closeModal();
        },
      };
    });
  }, [activeTable, filteredTableRows, closeModal]);

  // Auto-focus row 0 whenever query or tab changes
  useEffect(() => {
    setKeyboardIndex(0);
  }, [query, activeTab, mode]);

  // Unified Grouped Sections with Contextual Intelligence
  const groupedSections = useMemo((): { title: string; items: SearchItem[]; isTableSection?: boolean }[] => {
    const sections: { title: string; items: SearchItem[]; isTableSection?: boolean }[] = [];

    // INTELLIGENCE:
    // If opened via Ctrl+F (mode === 'table'), show Table Records on this page as FIRST SECTION!
    if (mode === 'table' && tableSearchItems.length > 0) {
      sections.push({
        title: `${activeTable?.tableName || 'Table'} Records on this Page`,
        items: tableSearchItems,
        isTableSection: true,
      });
    }

    if (!query.trim()) {
      if (mode !== 'table') {
        sections.push(
          { title: 'Core Operations', items: rankedItems.filter((i) => i.category === 'Pages').slice(0, 7) },
          { title: 'Quick Actions', items: rankedItems.filter((i) => i.category === 'Actions').slice(0, 6) },
          { title: 'Financial Reports', items: rankedItems.filter((i) => i.category === 'Reports').slice(0, 6) }
        );
      }
    } else {
      // Query is present:
      const bestMatches = rankedItems.slice(0, 3);
      const bestMatchIds = new Set(bestMatches.map((i) => i.id));
      const remainder = rankedItems.filter((i) => !bestMatchIds.has(i.id));

      if (mode !== 'table') {
        if (bestMatches.length > 0) {
          sections.push({ title: 'Best Matches', items: bestMatches });
        }
      }

      const pages = remainder.filter((i) => i.category === 'Pages');
      if (pages.length > 0) sections.push({ title: 'Pages & Navigation', items: pages });

      const actions = remainder.filter((i) => i.category === 'Actions');
      if (actions.length > 0) sections.push({ title: 'Quick Actions', items: actions });

      const reports = remainder.filter((i) => i.category === 'Reports');
      if (reports.length > 0) sections.push({ title: 'Reports & Document Reader', items: reports });

      const entities = remainder.filter((i) => i.category === 'Entities');
      if (entities.length > 0) sections.push({ title: 'Accounts & Securities', items: entities.slice(0, 8) });

      // If opened via Ctrl+K, show Table Records at the bottom (if any match)
      if (mode !== 'table' && tableSearchItems.length > 0) {
        sections.push({
          title: `Matching Records in ${activeTable?.tableName || 'Current Table'}`,
          items: tableSearchItems,
          isTableSection: true,
        });
      }
    }

    return sections.filter((s) => s.items.length > 0);
  }, [mode, tableSearchItems, rankedItems, query, activeTable?.tableName]);

  // Flattened list of visible items for keyboard indexing
  const flatVisibleItems = useMemo(() => {
    return groupedSections.flatMap((s) => s.items);
  }, [groupedSections]);

  // Execute Item Selection
  const handleSelect = useCallback(
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

  // Global Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoveredId(null);
      setKeyboardIndex((prev) => (prev < flatVisibleItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoveredId(null);
      setKeyboardIndex((prev) => (prev > 0 ? prev - 1 : flatVisibleItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = keyboardIndex >= 0 ? keyboardIndex : 0;
      if (flatVisibleItems[targetIndex]) {
        handleSelect(flatVisibleItems[targetIndex]);
      } else if (mode === 'table' && activeTable && query.trim()) {
        // User typed query and pressed Enter directly: apply query to table
        activeTable.onSearchChange(query.trim());
        closeModal();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  let currentItemCounter = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[9vh] sm:pt-[12vh] px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-2xl sm:max-w-3xl flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200/90 bg-white rounded-2xl animate-in zoom-in-95 duration-150 transition-all max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── UNIFIED COMMAND SEARCH HEADER ───────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/80 bg-white shrink-0">
          <Search className="w-5 h-5 text-[#2652C8] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'table' && activeTable
                ? `Search in ${activeTable.tableName} and across entire application...`
                : 'Type page, action, client, report, or command... (e.g. trades, ele01, settlement)'
            }
            className="w-full text-sm font-medium bg-transparent text-slate-900 placeholder:text-slate-400 outline-none caret-[#2652C8]"
          />

          {/* Active Table Context Badge if on a table */}
          {activeTable && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {activeTable.tableName}
              </span>
              <button
                type="button"
                onClick={() => setSearchMatchMode((m) => (m === 'OR' ? 'AND' : 'OR'))}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                title={`Match Mode: ${searchMatchMode} (Click to toggle)`}
              >
                {searchMatchMode}
              </button>
            </div>
          )}

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-slate-100 bg-slate-50/70 overflow-x-auto select-none shrink-0">
          {(['All', 'Pages', 'Actions', 'Reports', 'Entities'] as MainCategoryTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0',
                  isActive
                    ? 'bg-[#0A1A4A] text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── GROUPED RESULTS LIST ────────────────────────────────────────── */}
        <div
          ref={listRef}
          onMouseLeave={() => setHoveredId(null)}
          className="flex-1 overflow-y-auto p-3 space-y-4"
        >
          {groupedSections.length === 0 ? (
            <div className="py-14 px-6 text-center text-slate-400 text-xs">
              No matching commands, pages, or records found for{' '}
              <strong className="text-slate-700">"{query}"</strong>
            </div>
          ) : (
            groupedSections.map((section) => (
              <div key={section.title} className="space-y-1">
                {/* Section Group Header */}
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    {section.title.includes('Best') && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{section.title}</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    {section.items.length}
                  </span>
                </div>

                {/* Section Items */}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const itemIndex = currentItemCounter++;
                    const isSelected =
                      hoveredId === item.id || (hoveredId === null && keyboardIndex === itemIndex);
                    const IconComp = item.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setHoveredId(item.id)}
                        className={cn(
                          'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-all duration-100 group',
                          isSelected
                            ? 'bg-slate-100/90 text-slate-900 ring-1 ring-slate-200 shadow-2xs'
                            : 'hover:bg-slate-50/70 text-slate-700'
                        )}
                      >
                        {/* Left: Category Icon & Title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 border transition-colors shadow-2xs',
                              item.category === 'Actions'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : item.category === 'Reports'
                                ? 'bg-purple-50 text-purple-700 border-purple-200/80'
                                : item.category === 'Entities'
                                ? 'bg-blue-50 text-[#1D4ED8] border-blue-200/80'
                                : item.category === 'TableRows'
                                ? 'bg-blue-50 text-[#2652C8] border-blue-200/80'
                                : 'bg-slate-100 text-slate-700 border-slate-200/80'
                            )}
                          >
                            <IconComp className="w-4 h-4 stroke-[2]" />
                          </div>

                          {/* Title & Description */}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                              {highlightMatch(item.title, query)}
                            </div>
                            <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Right: Enter indicator on focused row */}
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-bold text-[10px] shadow-2xs flex items-center gap-1">
                              <span>Open</span>
                              <span className="font-mono">↵</span>
                            </span>
                          )}
                          {!isSelected && (
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

        {/* ── MODAL FOOTER ────────────────────────────────────────────────── */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 select-none shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                ↵
              </kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
            BizzMate Command Center
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
