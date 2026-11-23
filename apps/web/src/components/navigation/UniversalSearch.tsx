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
  Check,
  ChevronDown,
  SlidersHorizontal,
  Trash2,
  ExternalLink,
  FileDown,
  Printer,
  Building2,
  FileText
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTableSearch } from '@/context/TableSearchContext';
import { apiFetch } from '@/utils/apiClient';
import { downloadReportPdf } from '@/lib/pdf/reportPdfGenerator';
import { downloadReportExcel } from '@/lib/excel/reportExcelGenerator';
import { toast } from 'sonner';

export type MainCategoryTab = 'All' | 'Pages' | 'Actions' | 'Reports' | 'On Page' | 'Shortcuts';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: 'Pages' | 'Actions' | 'Reports' | 'Entities' | 'Shortcuts' | 'TableRows';
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string;
  isExternalTab?: boolean;
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
    keywords: ['home', 'overview', 'summary', 'metrics', 'kpi', 'dashboard', 'turnover'],
    icon: LayoutDashboard,
    href: '/',
  },
  {
    id: 'page-closing-rates',
    title: 'Closing Rates',
    description: 'Daily market settlement rates, closing prices, and mark-to-market valuations',
    category: 'Pages',
    keywords: ['rates', 'eod', 'closing', 'daily prices', 'market rates', 'mtm', 'valuation'],
    icon: TrendingUp,
    href: '/closing-rates',
  },
  {
    id: 'page-trade-import',
    title: 'Trade Import Wizard',
    description: 'Dynamic CSV / Excel trade transaction import wizard with flexible column mapping',
    category: 'Pages',
    keywords: ['import', 'upload', 'csv', 'excel', 'trades import', 'files', 'upload trades'],
    icon: FileSpreadsheet,
    href: '/trades?import=true',
  },
  {
    id: 'page-closing-rate-import',
    title: 'Closing Rates Import',
    description: 'Bulk import closing rates and open position valuation sheets',
    category: 'Pages',
    keywords: ['closing rates import', 'rates import', 'upload rates', 'import closing', 'eod import'],
    icon: TrendingUp,
    href: '/closing-rates?import=true',
  },

  // ── Pages: Reports & Financial Statements ───────────────────────
  {
    id: 'page-report-net-position',
    title: 'Net Position Report',
    description: 'Open contract exposures, quantity aggregates, and MTM valuations across scripts',
    category: 'Reports',
    keywords: ['net position', 'open positions', 'mtm', 'exposure', 'positions', 'reports', 'pnl', 'open position report'],
    icon: PieChart,
    href: '/reports/net-position',
  },
  {
    id: 'page-report-invoice',
    title: 'Client & Broker Invoices',
    description: 'Bilateral settled trade invoices and futures bills grouped by party and scrip',
    category: 'Reports',
    keywords: ['invoice', 'bill', 'client invoice', 'broker invoice', 'billing', 'statement', 'contract bill'],
    icon: FileText,
    href: '/reports/invoice',
  },
  {
    id: 'page-report-settlement-detail',
    title: 'Settlement Audit Report',
    description: 'Trade provenance categorized into Regular, Carry Forward, Back Forward, and Settlement',
    category: 'Reports',
    keywords: ['settlement audit', 'settlement report', 'audit report', 'settlement detail', 'breakdown', 'provenance'],
    icon: FileCheck2,
    href: '/reports/settlement-detail',
  },
  {
    id: 'page-report-settlement-summary',
    title: 'Settlement Summary (Reconciliation)',
    description: 'Executive double-entry clearing balance sheet with party net and equilibrium verification',
    category: 'Reports',
    keywords: ['settlement summary', 'reconciliation', 'balance sheet', 'settlement sheet', 'pnl', 'equilibrium'],
    icon: Scale,
    href: '/reports/settlement-summary',
  },
  {
    id: 'page-settlement-ops',
    title: 'Settlement Operations',
    description: 'Execute settlement cycle, generate bilateral bills, and freeze settled periods',
    category: 'Reports',
    keywords: ['settlement', 'run settlement', 'billing', 'operations', 'settlement cycle', 'execute settlement'],
    icon: FolderOpen,
    href: '/settlement',
  },
  {
    id: 'page-report-ledger',
    title: 'Ledger Report',
    description: 'Party-wise financial accounting ledger with chronological vouchers and balances',
    category: 'Reports',
    keywords: ['ledger', 'statement', 'party ledger', 'debit', 'credit', 'account statement', 'ledger report'],
    icon: BookText,
    href: '/ledger',
  },
  {
    id: 'page-report-voucher',
    title: 'Voucher Register',
    description: 'Journal, payment, receipt, and adjustment voucher accounting entries',
    category: 'Reports',
    keywords: ['voucher', 'journal', 'payment', 'receipt', 'contra', 'entry', 'vouchers'],
    icon: Receipt,
    href: '/vouchers',
  },
  {
    id: 'page-report-trial-balance',
    title: 'Trial Balance',
    description: 'Double-entry trial balance report across asset, liability, and revenue groups',
    category: 'Reports',
    keywords: ['trial balance', 'tb', 'balances', 'financial statements', 'accounting', 'audit'],
    icon: Scale,
    href: '/trial-balance',
  },

  // ── Pages: Masters ──────────────────────────────────────────────
  {
    id: 'page-master-clients',
    title: 'Clients Master',
    description: 'Manage Sundry Debtors, contact telephone numbers, bank details, and opening balances',
    category: 'Pages',
    keywords: ['clients', 'client', 'customers', 'accounts', 'sundry debtors', 'parties'],
    icon: Users,
    href: '/clients',
  },
  {
    id: 'page-master-brokers',
    title: 'Brokers Master',
    description: 'Manage Sundry Creditors, clearing brokers, brokerage tariffs, and settlement terms',
    category: 'Pages',
    keywords: ['brokers', 'broker', 'clearing', 'sundry creditors', 'agents'],
    icon: ShieldCheck,
    href: '/brokers',
  },
  {
    id: 'page-master-scripts',
    title: 'Scripts Master',
    description: 'Configure traded securities, commodity contracts, short names, lot sizes, and units',
    category: 'Pages',
    keywords: ['scripts', 'script', 'securities', 'instruments', 'commodities', 'symbols', 'lot size'],
    icon: ScrollText,
    href: '/scripts',
  },
  {
    id: 'page-master-exchanges',
    title: 'Exchanges Master',
    description: 'Bourses and marketplaces configuration (MCX, SGX, NYME, MDEX, LME)',
    category: 'Pages',
    keywords: ['exchanges', 'exchange', 'mcx', 'sgx', 'nyme', 'lme', 'mdex', 'bourses'],
    icon: Globe,
    href: '/exchanges',
  },
  {
    id: 'page-master-currencies',
    title: 'Currencies Master',
    description: 'Base currencies and FX symbols (INR ₹, USD $, MYR RM, etc.)',
    category: 'Pages',
    keywords: ['currencies', 'currency', 'inr', 'usd', 'myr', 'fx', 'forex'],
    icon: Coins,
    href: '/currencies',
  },
  {
    id: 'page-master-expiries',
    title: 'Expiry Dates Master',
    description: 'Active contract expiry calendar and settlement cycle dates',
    category: 'Pages',
    keywords: ['expiries', 'expiry', 'expiry dates', 'settlement dates', 'contracts'],
    icon: Calendar,
    href: '/expiry-dates',
  },
  {
    id: 'page-master-brokerage',
    title: 'Brokerage Rules',
    description: 'Client and broker commission structures per script, volume, and lot',
    category: 'Pages',
    keywords: ['brokerage', 'commission', 'charges', 'rates'],
    icon: Percent,
    href: '/brokerage',
  },
  {
    id: 'page-master-others',
    title: 'Chart of Accounts (All)',
    description: 'Full chart of accounts across all ledger groups and classifications',
    category: 'Pages',
    keywords: ['accounts', 'ledger', 'groups', 'chart of accounts'],
    icon: Layers,
    href: '/account-master',
  },
  {
    id: 'page-admin-users',
    title: 'Users & Permissions',
    description: 'User access control, whitelist status, and administrative role assignments',
    category: 'Pages',
    keywords: ['users', 'roles', 'permissions', 'whitelist', 'admin'],
    icon: Users,
    href: '/users',
  },

  // ── Actions & Workflows ─────────────────────────────────────────
  {
    id: 'action-add-trade',
    title: 'Add New Trade',
    description: 'Open the quick trade entry modal with smart keyboard focus',
    category: 'Actions',
    keywords: ['trade', 'trades', 'new trade', 'create trade', 'enter trade', 'add order', 'add trade'],
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
    description: 'Open client onboarding form with phone and account verification',
    category: 'Actions',
    keywords: ['client', 'clients', 'new client', 'create customer', 'add client', 'debtor'],
    icon: Plus,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-open-add-client'));
      }
    },
    href: '/clients?action=add',
  },
  {
    id: 'action-add-broker',
    title: 'Add New Broker',
    description: 'Register a new clearing broker or creditor with banking details',
    category: 'Actions',
    keywords: ['broker', 'brokers', 'new broker', 'create broker', 'add broker', 'creditor'],
    icon: Plus,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bizzmate-open-add-broker'));
      }
    },
    href: '/brokers?action=add',
  },
  {
    id: 'action-new-voucher',
    title: 'Create Voucher Entry',
    description: 'Book payment, receipt, or journal debit/credit voucher',
    category: 'Actions',
    keywords: ['voucher', 'new voucher', 'create voucher', 'add payment', 'receipt'],
    icon: Plus,
    href: '/vouchers?action=add',
  },

  // ── Report Preview & Export Actions (Full Screen Viewer) ─────────
  {
    id: 'action-preview-net-position',
    title: 'Preview & Export Net Position Report',
    description: 'Open distraction-free document viewer in new tab to download branded PDF or Excel',
    category: 'Actions',
    keywords: ['export net position', 'preview net position', 'download net position', 'net position pdf', 'export report'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=net-position', '_blank');
    },
  },
  {
    id: 'action-preview-invoice',
    title: 'Preview & Export Invoice Statement',
    description: 'Open standalone document viewer for bilateral contract bills with PDF and Excel export',
    category: 'Actions',
    keywords: ['export invoice', 'preview invoice', 'download invoice', 'invoice pdf', 'bill pdf', 'export bills'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=invoice', '_blank');
    },
  },
  {
    id: 'action-preview-settlement-detail',
    title: 'Preview & Export Settlement Audit',
    description: 'Open standalone document viewer for settlement provenance and trade breakdown',
    category: 'Actions',
    keywords: ['export settlement audit', 'preview settlement', 'download audit report', 'settlement pdf'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=settlement-detail', '_blank');
    },
  },
  {
    id: 'action-preview-settlement-summary',
    title: 'Preview & Export Settlement Summary Sheet',
    description: 'Open standalone viewer for consolidated balance sheet with PDF and Excel export',
    category: 'Actions',
    keywords: ['export settlement summary', 'preview settlement summary', 'download balance sheet', 'reconciliation pdf'],
    icon: ExternalLink,
    isExternalTab: true,
    action: () => {
      window.open('/report-viewer?type=settlement-summary', '_blank');
    },
  },
  {
    id: 'action-export-net-position-pdf',
    title: 'Export Net Position (Direct PDF)',
    description: 'Directly generate and download the branded executive Net Position PDF document',
    category: 'Actions',
    keywords: ['download pdf', 'export pdf', 'quick pdf', 'net position pdf', 'download report'],
    icon: FileDown,
    action: async () => {
      toast.info('Generating Net Position PDF...');
      try {
        const res = await apiFetch('/reports/net-position?groupBy=CLIENT');
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        const headers = ['Symbol / Script', 'Expiry', 'Buy Qty', 'Buy Avg', 'Sell Qty', 'Sell Avg', 'Net Qty', 'Closing Rate', 'Market Value', 'Unrealized PnL'];
        const groups = data.groups.map((g: any) => ({
          groupTitle: `Client: ${g.code} - ${g.name}`,
          rows: g.positions.map((p: any) => [
            p.securityName || p.scriptShortName,
            p.expiryFormatted || '-',
            p.buyQty,
            p.buyAvgRate > 0 ? p.buyAvgRate.toFixed(2) : '-',
            p.sellQty,
            p.sellAvgRate > 0 ? p.sellAvgRate.toFixed(2) : '-',
            p.netQty,
            p.closingRate !== null ? p.closingRate.toFixed(2) : 'Pending',
            p.marketValue.toFixed(2),
            p.unrealizedPnL.toFixed(2),
          ]),
          subtotalRow: [
            `Subtotal (${g.name || g.code})`,
            '-',
            g.totals.buyQty,
            '-',
            g.totals.sellQty,
            '-',
            g.totals.netQty,
            '-',
            g.totals.marketValue.toFixed(2),
            g.totals.unrealizedPnL.toFixed(2),
          ],
        }));

        const grandTotalRow = [
          'GRAND TOTAL',
          '-',
          data.groups.reduce((acc: number, g: any) => acc + g.totals.buyQty, 0),
          '-',
          data.groups.reduce((acc: number, g: any) => acc + g.totals.sellQty, 0),
          '-',
          data.groups.reduce((acc: number, g: any) => acc + g.totals.netQty, 0),
          '-',
          (data.summary?.totalNotionalMarketValue || 0).toFixed(2),
          (data.summary?.totalUnrealizedPnL || 0).toFixed(2),
        ];

        downloadReportPdf({
          reportTitle: 'Net Position Report (Open Positions)',
          reportSubtitle: 'Live contract exposures aggregated by client',
          periodLabel: 'As of Date',
          asOfDate: data.asOfDate,
          headers,
          groups,
          grandTotalRow,
          columnAlignments: ['left', 'center', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
        });
        toast.success('Net Position PDF downloaded successfully!');
      } catch (err: any) {
        toast.error('Failed to download PDF', { description: err.message });
      }
    },
  },

  // ── Shortcuts ───────────────────────────────────────────────────
  {
    id: 'shortcut-search',
    title: 'Universal Command Center',
    description: 'Open this global search and command palette anywhere in BizzMate',
    category: 'Shortcuts',
    keywords: ['search', 'find', 'palette', 'shortcut', 'command', 'ctrl k'],
    icon: Keyboard,
    shortcut: 'Ctrl + K',
  },
  {
    id: 'shortcut-table-filter',
    title: 'Current Table Filter & Search',
    description: 'Instant multi-field row filtering on active tables and ledgers',
    category: 'Shortcuts',
    keywords: ['find on page', 'table search', 'filter table', 'ctrl f'],
    icon: Keyboard,
    shortcut: 'Ctrl + F',
  },
  {
    id: 'shortcut-save',
    title: 'Submit / Save Modals',
    description: 'Submit and commit active modal dialog forms without mouse clicks',
    category: 'Shortcuts',
    keywords: ['save', 'submit', 'modal', 'enter', 'shortcut'],
    icon: Keyboard,
    shortcut: 'Ctrl + Enter',
  },
  {
    id: 'shortcut-escape',
    title: 'Close Modal / Dropdown',
    description: 'Dismiss any open dropdown, modal dialog, or search palette',
    category: 'Shortcuts',
    keywords: ['close', 'cancel', 'dismiss', 'escape'],
    icon: Keyboard,
    shortcut: 'Esc',
  },
];

export interface MultiFieldCondition {
  id: string;
  column: string;
  operator: 'contains' | 'equals' | 'starts_with';
  value: string;
  conjunction: 'AND' | 'OR';
}

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
  if (key === 'exchange') {
    return record.exchange?.code || record.exchange?.name || record.exchange || '';
  }

  return '';
}

function getAllSearchableStrings(record: any): { key: string; label: string; value: string }[] {
  if (!record) return [];
  const entries: { key: string; label: string; value: string }[] = [];

  function walk(obj: any, prefix = '', labelPrefix = '', depth = 0) {
    if (depth > 3 || !obj) return;
    if (typeof obj === 'string' || typeof obj === 'number') {
      const valStr = String(obj).trim();
      if (valStr) {
        entries.push({
          key: prefix || 'field',
          label: labelPrefix || prefix || 'Field',
          value: valStr,
        });
      }
      return;
    }
    if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'isDeleted') continue;
        const subKey = prefix ? `${prefix}.${k}` : k;
        const subLabel = k.charAt(0).toUpperCase() + k.slice(1);
        walk(v, subKey, labelPrefix ? `${labelPrefix} ${subLabel}` : subLabel, depth + 1);
      }
    }
  }

  walk(record);
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
      <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded">
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
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();
  const keywords = item.keywords.map((k) => k.toLowerCase());

  let score = 0;

  // 1. Exact title match
  if (title === q) {
    score += 2500;
  } else if (title.startsWith(q)) {
    score += 1200;
  } else if (title.includes(q)) {
    score += 500;
  }

  // 2. Keyword exact / prefix match
  for (const kw of keywords) {
    if (kw === q) {
      score += 800;
    } else if (kw.startsWith(q)) {
      score += 400;
    } else if (kw.includes(q)) {
      score += 150;
    }
  }

  // 3. Category weighting (Pages #1, Actions #2, Reports #3)
  // Ensures "trade" -> Trades Page is #1, Add Trade is #2!
  if (item.category === 'Pages') score += 120;
  else if (item.category === 'Actions') score += 100;
  else if (item.category === 'Reports') score += 80;
  else if (item.category === 'Entities') score += 60;
  else if (item.category === 'Shortcuts') score += 10;

  // 4. Word boundary match in title
  const words = title.split(/[\s-]+/);
  if (words.some((w) => w === q)) score += 600;
  else if (words.some((w) => w.startsWith(q))) score += 300;

  // 5. Description partial match
  if (desc.includes(q)) score += 60;

  return score;
}

export function UniversalSearch() {
  const { isOpen, mode, setMode, closeModal, activeTable } = useTableSearch();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MainCategoryTab>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(0);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number>(-1);

  // Table Match Mode: DEFAULT TO 'OR' AS SPECIFIED BY USER
  const [searchMatchMode, setSearchMatchMode] = useState<'AND' | 'OR'>('OR');
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isMultiFieldOpen, setIsMultiFieldOpen] = useState(false);
  const [conditions, setConditions] = useState<MultiFieldCondition[]>([]);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic counterparty accounts loaded for deep contextual actions
  const [dynamicEntities, setDynamicEntities] = useState<SearchItem[]>([]);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);
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
                description: `${roleLabel} Profile Master | Ledger balance & KYC`,
                category: 'Entities',
                keywords: [a.code, a.name, roleLabel.toLowerCase(), 'account', 'party'],
                icon: isBroker ? ShieldCheck : Users,
                href: isBroker ? `/brokers?id=${a.id}` : `/clients?id=${a.id}`,
              });

              // 2. Net Position Deep Action for Entity
              items.push({
                id: `action-netpos-${a.id}`,
                title: `Net Position for "${a.code} - ${a.name}"`,
                description: `View real-time open positions and MTM valuations for this ${roleLabel.toLowerCase()}`,
                category: 'Actions',
                keywords: [a.code, a.name, 'net position', 'open position', roleLabel.toLowerCase()],
                icon: PieChart,
                href: `/reports/net-position?${isBroker ? 'brokerId' : 'accountId'}=${a.id}`,
              });

              // 3. Invoice Statement Deep Action for Entity
              items.push({
                id: `action-invoice-${a.id}`,
                title: `Invoice Statement for "${a.code} - ${a.name}"`,
                description: `Bilateral settlement contract notes and billing statement for this ${roleLabel.toLowerCase()}`,
                category: 'Actions',
                keywords: [a.code, a.name, 'invoice', 'bill', roleLabel.toLowerCase()],
                icon: FileText,
                href: `/reports/invoice?entityType=${isBroker ? 'BROKER' : 'CLIENT'}&entityId=${a.id}`,
              });

              // 4. Ledger Statement Deep Action for Entity
              items.push({
                id: `action-ledger-${a.id}`,
                title: `Ledger Statement for "${a.code} - ${a.name}"`,
                description: `Financial accounting transactions and debit/credit ledger`,
                category: 'Actions',
                keywords: [a.code, a.name, 'ledger', 'statement', roleLabel.toLowerCase()],
                icon: BookText,
                href: `/ledger?accountId=${a.id}`,
              });

              // 5. Standalone Document Viewer Action for Entity
              items.push({
                id: `action-viewer-${a.id}`,
                title: `Preview Report Document for "${a.code}"`,
                description: `Open standalone report viewer in new tab to download branded PDF statement`,
                category: 'Actions',
                keywords: [a.code, a.name, 'export report', 'preview report', 'pdf', 'download'],
                icon: ExternalLink,
                isExternalTab: true,
                action: () => {
                  window.open(`/report-viewer?type=net-position&entityId=${a.id}`, '_blank');
                },
              });
            });
          }
        }

        if (scrRes.ok) {
          const scrs = await scrRes.json();
          if (Array.isArray(scrs)) {
            scrs.forEach((s: any) => {
              const name = s.fullName || s.shortName || s.symbol || s.id;
              items.push({
                id: `script-${s.id}`,
                title: `Script: ${s.shortName || s.symbol} (${s.fullName || 'Security'})`,
                description: `Traded contract | Lot Size: ${s.marketLot || s.lotSize || 1}`,
                category: 'Entities',
                keywords: [s.shortName || '', s.fullName || '', s.symbol || '', 'script', 'security'],
                icon: ScrollText,
                href: `/scripts?id=${s.id}`,
              });
            });
          }
        }

        setDynamicEntities(items);
      } catch (err) {
        console.warn('Failed to preload search entities:', err);
      }
    }
    loadEntities();
  }, []);

  // Reset focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setKeyboardIndex(0);
      setSelectedTableIndex(-1);
      setHoveredId(null);
      setTimeout(() => {
        if (mode === 'table') {
          tableInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 50);
    }
  }, [isOpen, mode]);

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
    else if (activeTab === 'Shortcuts') items = items.filter((i) => i.category === 'Shortcuts');

    if (!query.trim()) {
      return items;
    }

    const scored = items
      .map((item) => ({
        item,
        score: computeItemScore(item, query),
      }))
      .filter((entry) => entry.score > 0);

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.item);
  }, [allSearchItems, query, activeTab]);

  // Auto-focus row 0 whenever query or results change
  useEffect(() => {
    setKeyboardIndex(0);
  }, [query, activeTab]);

  // Filter Active Table Rows (Ctrl+F)
  const filteredTableRows = useMemo(() => {
    if (!activeTable?.records || activeTable.records.length === 0) return [];

    const searchQuery = activeTable.searchQuery || '';
    const hasSearchQuery = Boolean(searchQuery.trim());
    const hasConditions = conditions.some((c) => c.value && c.value.trim());

    if (!hasSearchQuery && !hasConditions) {
      return [];
    }

    const terms = searchQuery
      .toLowerCase()
      .trim()
      .split(/[,\s]+/)
      .filter(Boolean);

    return activeTable.records
      .map((record, index) => {
        let matchedColInfo: { key: string; label: string; value: string } | null = null;
        let textMatchPassed = terms.length === 0;

        if (terms.length > 0) {
          const candidateEntries: { key: string; label: string; value: string }[] = [];

          if (
            activeTable.columns &&
            activeTable.columns.length > 0 &&
            activeTable.searchColumn &&
            activeTable.searchColumn !== 'ALL'
          ) {
            const col = activeTable.columns.find((c) => c.key === activeTable.searchColumn);
            if (col) {
              const val = String(getRecordValue(record, col.key) ?? '').trim();
              if (val) candidateEntries.push({ key: col.key, label: col.label, value: val });
            }
          } else {
            const allStrings = getAllSearchableStrings(record);
            candidateEntries.push(...allStrings);
          }

          if (searchMatchMode === 'AND') {
            const termMatches = terms.map((term) =>
              candidateEntries.find((entry) => entry.value.toLowerCase().includes(term))
            );
            textMatchPassed = termMatches.every(Boolean);
            if (textMatchPassed) {
              matchedColInfo = termMatches[0] || null;
            }
          } else {
            // OR mode (DEFAULT)
            const matchedEntry = candidateEntries.find((entry) =>
              terms.some((term) => entry.value.toLowerCase().includes(term))
            );
            textMatchPassed = Boolean(matchedEntry);
            if (matchedEntry) {
              matchedColInfo = matchedEntry;
            }
          }
        }

        if (textMatchPassed) {
          return {
            index,
            record,
            matchedColumn: matchedColInfo,
          };
        }
        return null;
      })
      .filter(Boolean) as {
      index: number;
      record: any;
      matchedColumn: { key: string; label: string; value: string } | null;
    }[];
  }, [
    activeTable?.records,
    activeTable?.searchQuery,
    activeTable?.columns,
    activeTable?.searchColumn,
    searchMatchMode,
    conditions,
  ]);

  // Primary columns for table display
  const primaryCols = useMemo(() => {
    if (!activeTable?.columns || activeTable.columns.length === 0) return [];
    return activeTable.columns.slice(0, 3);
  }, [activeTable?.columns]);

  // Handle Selection of an item
  const handleSelect = useCallback(
    (item: SearchItem) => {
      closeModal();
      if (item.action) {
        item.action();
      }
      if (item.href && !item.isExternalTab) {
        router.push(item.href);
      }
    },
    [router, closeModal]
  );

  // Grouped search items for clean display with group headers
  const groupedSections = useMemo((): { title: string; items: SearchItem[]; isBestMatch?: boolean }[] => {
    if (!query.trim()) {
      // Clean non-search view: group by category
      return [
        { title: 'Pages & Views', items: rankedItems.filter((i) => i.category === 'Pages'), isBestMatch: false },
        { title: 'Quick Actions', items: rankedItems.filter((i) => i.category === 'Actions').slice(0, 8), isBestMatch: false },
        { title: 'Reports & Statements', items: rankedItems.filter((i) => i.category === 'Reports'), isBestMatch: false },
        { title: 'Shortcuts', items: rankedItems.filter((i) => i.category === 'Shortcuts'), isBestMatch: false },
      ].filter((s) => s.items.length > 0);
    }

    // When searching: Top match section + categorized sections
    const bestMatches = rankedItems.slice(0, 2);
    const bestMatchIds = new Set(bestMatches.map((i) => i.id));
    const remainder = rankedItems.filter((i) => !bestMatchIds.has(i.id));

    const sections: { title: string; items: SearchItem[]; isBestMatch?: boolean }[] = [
      { title: 'Best Match', items: bestMatches, isBestMatch: true },
      { title: 'Pages & Navigation', items: remainder.filter((i) => i.category === 'Pages'), isBestMatch: false },
      { title: 'Quick Actions', items: remainder.filter((i) => i.category === 'Actions'), isBestMatch: false },
      { title: 'Reports & Document Export', items: remainder.filter((i) => i.category === 'Reports'), isBestMatch: false },
      { title: 'Accounts & Entities', items: remainder.filter((i) => i.category === 'Entities').slice(0, 6), isBestMatch: false },
      { title: 'Keyboard Shortcuts', items: remainder.filter((i) => i.category === 'Shortcuts'), isBestMatch: false },
    ];

    return sections.filter((s) => s.items.length > 0);
  }, [rankedItems, query]);

  // Flattened list of visible items for keyboard indexing
  const flatVisibleItems = useMemo(() => {
    return groupedSections.flatMap((s) => s.items);
  }, [groupedSections]);

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
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (activeTable) {
        setMode(mode === 'app' ? 'table' : 'app');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };

  // Table onKeyDown handler matching user requirements:
  // If user hits enter on search bar: typed query is applied
  // If user arrowed down to row 1 (e.g. ele01): that row is autocompleted to search bar!
  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTableIndex((prev) =>
        filteredTableRows.length > 0 ? (prev < filteredTableRows.length - 1 ? prev + 1 : 0) : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTableIndex((prev) =>
        filteredTableRows.length > 0 ? (prev > 0 ? prev - 1 : filteredTableRows.length - 1) : -1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedTableIndex >= 0 && filteredTableRows[selectedTableIndex]) {
        // Autocomplete selected row value to search bar
        const row = filteredTableRows[selectedTableIndex];
        const primaryVal = String(
          row.matchedColumn?.value ||
            getRecordValue(row.record, primaryCols[0]?.key || '') ||
            ''
        ).trim();

        if (primaryVal) {
          activeTable?.onSearchChange(primaryVal);
        }
        if (activeTable?.onSelectRow) {
          activeTable.onSelectRow(row.record);
        }
        closeModal();
      } else {
        // User hit Enter on search bar directly
        closeModal();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setMode('app');
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  let currentItemCounter = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-start justify-center pt-14 sm:pt-20 p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 font-body"
      onClick={closeModal}
    >
      <div
        className={cn(
          'bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-all max-h-[85vh]',
          mode === 'table' ? 'max-w-3xl' : 'max-w-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header Unified Switcher (Ctrl+K / Ctrl+F) ───────────────── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-slate-50/80 select-none">
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('app')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                mode === 'app'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Universal Command</span>
              <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold">
                Ctrl+K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTable) setMode('table');
              }}
              disabled={!activeTable}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                mode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : activeTable
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 cursor-not-allowed opacity-50'
              )}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Current Table{activeTable ? `: ${activeTable.tableName}` : ''}</span>
              <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold">
                Ctrl+F
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTable && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Press <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-600 text-[10px]">Tab</kbd> to toggle
              </span>
            )}
            <button
              type="button"
              onClick={closeModal}
              className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Close (Esc)"
            >
              <span>Esc</span>
            </button>
          </div>
        </div>

        {/* ── Mode 1: Table Filter Mode (Ctrl+F) ───────────────────────────── */}
        {mode === 'table' ? (
          <div className="flex flex-col overflow-hidden">
            {/* Table Search Input Bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-white">
              <Search className="w-5 h-5 text-emerald-600 shrink-0" />
              <input
                ref={tableInputRef}
                type="text"
                value={activeTable?.searchQuery || ''}
                onChange={(e) => {
                  activeTable?.onSearchChange(e.target.value);
                  setSelectedTableIndex(-1);
                }}
                placeholder={`Search ${activeTable?.tableName || 'table'} records (e.g. ele01, reliance)...`}
                className="w-full text-sm font-medium bg-transparent text-slate-900 placeholder:text-slate-400 outline-none caret-emerald-600"
                onKeyDown={handleTableKeyDown}
              />

              {activeTable?.searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    activeTable?.onSearchChange('');
                    tableInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors shrink-0"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}

              {/* AND / OR Match Mode Toggle Button (OR is DEFAULT) */}
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setSearchMatchMode('OR')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer text-xs',
                    searchMatchMode === 'OR'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="OR: Row can match ANY typed word (Default)"
                >
                  OR
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMatchMode('AND')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer text-xs',
                    searchMatchMode === 'AND'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="AND: Row must match ALL typed words"
                >
                  AND
                </button>
              </div>

              {/* Target Columns Dropdown */}
              {activeTable?.columns && activeTable.columns.length > 0 && (
                <div className="relative shrink-0" ref={columnDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border select-none bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    title="Select columns to search in"
                  >
                    <span>Columns</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isColumnDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-72 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Columns</span>
                        <button
                          type="button"
                          onClick={() => {
                            activeTable.onSearchColumnChange?.('ALL');
                            setIsColumnDropdownOpen(false);
                          }}
                          className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
                        >
                          All Columns
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {activeTable.columns.map((col) => (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => {
                              activeTable.onSearchColumnChange?.(col.key);
                              setIsColumnDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left hover:bg-slate-50 text-slate-700 font-medium"
                          >
                            <span className="truncate">{col.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Table Search Results Table (Action / Enter Col Removed as requested) */}
            <div className="relative overflow-hidden flex flex-col">
              {filteredTableRows.length > 0 ? (
                <div className="overflow-x-auto max-h-[46vh] overflow-y-auto divide-y divide-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200">
                      <tr>
                        {primaryCols.map((col) => (
                          <th
                            key={col.key}
                            className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"
                          >
                            {col.label}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Matched In
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredTableRows.map((row, idx) => {
                        const isSelected = idx === selectedTableIndex;
                        return (
                          <tr
                            key={row.record.id || idx}
                            onClick={() => {
                              const primaryVal = String(
                                row.matchedColumn?.value ||
                                  getRecordValue(row.record, primaryCols[0]?.key || '') ||
                                  ''
                              ).trim();
                              if (primaryVal) activeTable?.onSearchChange(primaryVal);
                              if (activeTable?.onSelectRow) activeTable.onSelectRow(row.record);
                              closeModal();
                            }}
                            onMouseEnter={() => setSelectedTableIndex(idx)}
                            className={cn(
                              'transition-colors duration-75 cursor-pointer',
                              isSelected
                                ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600'
                                : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                            )}
                          >
                            {primaryCols.map((col) => {
                              const val = String(getRecordValue(row.record, col.key) ?? '');
                              return (
                                <td
                                  key={col.key}
                                  className={cn(
                                    'px-4 py-2.5 text-xs text-slate-800 truncate max-w-[200px]',
                                    isSelected && 'text-slate-950 font-semibold'
                                  )}
                                >
                                  {highlightMatch(val, activeTable?.searchQuery || '')}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 text-xs truncate max-w-[280px]">
                              {row.matchedColumn ? (
                                <div className="inline-flex items-center gap-1.5 max-w-full">
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {row.matchedColumn.label}
                                  </span>
                                  <span className="text-xs text-slate-700 truncate font-mono">
                                    {highlightMatch(row.matchedColumn.value, activeTable?.searchQuery || '')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : activeTable?.searchQuery ? (
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    No records found matching "{activeTable.searchQuery}"
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Try typing a different name, symbol, or account code.
                  </p>
                </div>
              ) : (
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Type to filter {activeTable?.tableName || 'table'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Arrow down to highlight a row and hit Enter to autocomplete it.
                  </p>
                </div>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-4">
                <span>↑↓ to navigate rows</span>
                <span>↵ to select / autocomplete</span>
                <span>Esc to dismiss</span>
              </div>
              <div>
                <strong>{filteredTableRows.length}</strong> matches in {activeTable?.tableName}
              </div>
            </div>
          </div>
        ) : (
          /* ── Mode 2: Universal Command Mode (Ctrl+K) ─────────────────────── */
          <>
            {/* Search Header Input */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-white">
              <Search className="w-5 h-5 text-[#2652C8] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command, page, client, report, or export... (e.g. trades, ele01, export net position)"
                className="w-full text-sm font-medium bg-transparent text-slate-900 placeholder:text-slate-400 outline-none caret-[#2652C8]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-slate-100 bg-slate-50/60 overflow-x-auto select-none">
              {(['All', 'Pages', 'Actions', 'Reports', 'Shortcuts'] as MainCategoryTab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0',
                      isActive
                        ? 'bg-[#2652C8] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Grouped Results List with Group Headings & High-Contrast Focused Rows */}
            <div
              ref={listRef}
              onMouseLeave={() => setHoveredId(null)}
              className="max-h-[52vh] overflow-y-auto p-2 space-y-4"
            >
              {groupedSections.length === 0 ? (
                <div className="py-14 px-6 text-center text-slate-400 text-xs">
                  No matching commands or pages found for <strong className="text-slate-700">"{query}"</strong>
                </div>
              ) : (
                groupedSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    {/* Section Group Header (Replaced Noisy Badges) */}
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        {section.isBestMatch && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
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
                              'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-all duration-100',
                              isSelected
                                ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white ring-1 ring-blue-300 border-l-4 border-l-[#2652C8] shadow-xs'
                                : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                            )}
                          >
                            {/* Left: High-Contrast Dynamic Icon */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors',
                                  isSelected
                                    ? 'bg-[#2652C8] text-white border-[#2652C8] shadow-xs'
                                    : item.category === 'Actions'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : item.category === 'Reports'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : item.category === 'Entities'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : item.category === 'Shortcuts'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-blue-50 text-[#2652C8] border-blue-100'
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

                            {/* Right: Shortcut or Navigation Arrow */}
                            <div className="shrink-0 ml-3 flex items-center gap-2">
                              {item.shortcut ? (
                                <kbd className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold shadow-2xs">
                                  {item.shortcut}
                                </kbd>
                              ) : item.isExternalTab ? (
                                <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                                  <span>Preview</span>
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    'text-[11px] font-mono text-slate-400 flex items-center gap-1 font-semibold transition-opacity',
                                    isSelected ? 'opacity-100 text-[#2652C8]' : 'opacity-0'
                                  )}
                                >
                                  <span>↵ Enter</span>
                                </span>
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

            {/* Footer Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span>↑↓ navigate</span>
                <span>↵ select (defaults to top match)</span>
                <span>esc dismiss</span>
              </div>
              <span className="text-slate-400 font-sans">BizzMate Universal Command Center</span>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
