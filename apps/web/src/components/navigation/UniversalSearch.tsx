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
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTableSearch } from '@/context/TableSearchContext';

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

export interface MultiFieldCondition {
  id: string;
  column: string;
  operator: 'contains' | 'equals' | 'starts_with';
  value: string;
  conjunction: 'AND' | 'OR';
}

function getRecordValue(record: any, key: string): any {
  if (!record || !key) return '';

  // 1. Direct property check (if it's a primitive or object with code/name)
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

  // 2. Nested dot notation e.g. "account.code", "account.name", "group.name", "exchange.code"
  if (key.includes('.')) {
    const parts = key.split('.');
    let cur = record;
    for (const p of parts) {
      if (cur == null) return '';
      cur = cur[p];
    }
    return cur ?? '';
  }

  // 3. Known domain aliases across trades and master blotters
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

export function UniversalSearch() {
  const { isOpen, mode, setMode, closeModal, activeTable } = useTableSearch();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('All');
  const [subCategory, setSubCategory] = useState<'All' | 'Blotter' | 'Report' | 'Master'>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(-1);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);

  // Table Mode: Match Mode, Multi-Field & Columns Dropdown State
  const [searchMatchMode, setSearchMatchMode] = useState<'AND' | 'OR'>('AND');
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isMultiFieldOpen, setIsMultiFieldOpen] = useState(false);
  const [conditions, setConditions] = useState<MultiFieldCondition[]>([]);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input and reset hover/keyboard states when opened or mode switched
  useEffect(() => {
    if (isOpen) {
      if (mode === 'app') {
        setQuery('');
        setActiveTab('All');
        setSubCategory('All');
        setHoveredId(null);
        setKeyboardIndex(-1);
        setTimeout(() => inputRef.current?.focus(), 60);
      } else {
        setSelectedTableIndex(0);
        setIsColumnDropdownOpen(false);
        setTimeout(() => tableInputRef.current?.focus(), 60);
      }
    }
  }, [isOpen, mode]);

  // Click outside to close column dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
    };
    if (isColumnDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isColumnDropdownOpen]);

  // Reset selected table index when table search query or conditions change
  useEffect(() => {
    setSelectedTableIndex(0);
  }, [activeTable?.searchQuery, conditions]);

  // Primary 2 to 3 columns to display in the modal table
  const primaryCols = useMemo(() => {
    if (!activeTable?.columns || activeTable.columns.length === 0) return [];
    return activeTable.columns.slice(0, 3);
  }, [activeTable?.columns]);

  const hasSelectedSpecificCols = Boolean(
    (activeTable?.searchColumn && activeTable.searchColumn !== 'ALL' && activeTable.searchColumn.trim() !== '') ||
      (activeTable?.selectedColumns &&
        activeTable.selectedColumns.length > 0 &&
        !activeTable.selectedColumns.includes('ALL'))
  );

  const columnButtonLabel = useMemo(() => {
    if (!activeTable?.columns || !hasSelectedSpecificCols) return '✦ All Columns';
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
    return '✦ All Columns';
  }, [activeTable?.columns, activeTable?.selectedColumns, activeTable?.searchColumn, hasSelectedSpecificCols]);

  // Filtered rows for the current active table with match detection
  const filteredTableRows = useMemo(() => {
    const records = activeTable?.records || [];
    const q = (activeTable?.searchQuery || '').trim().toLowerCase();
    const columns = activeTable?.columns || [];
    const activeConditions = conditions.filter((c) => c.value && c.value.trim());

    if (!records.length) return [];

    // USER REQUIREMENT: If nothing is typed (and no multi-field conditions), show nothing!
    if (!q && activeConditions.length === 0) {
      return [];
    }

    // Target columns to search
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

    for (const record of records) {
      let matchedColInfo: { key: string; label: string; value: string } | null = null;
      let textMatchPassed = terms.length === 0;

      // 1. Text Search matching (respecting searchMatchMode: AND vs OR)
      if (terms.length > 0) {
        const candidateEntries: { key: string; label: string; value: string }[] = [];

        for (const col of targetCols) {
          const val = String(getRecordValue(record, col.key) ?? '');
          if (val) candidateEntries.push({ key: col.key, label: col.label, value: val });
        }

        // If searching ALL, also include any deep nested searchable fields
        if (!activeTable?.searchColumn || activeTable.searchColumn === 'ALL') {
          const deepStrings = getAllSearchableStrings(record);
          for (const ds of deepStrings) {
            candidateEntries.push(ds);
          }
        }

        if (searchMatchMode === 'AND') {
          // AND mode: Every term in terms must match in at least one candidate entry
          const termMatches = terms.map((term) =>
            candidateEntries.find((entry) => entry.value.toLowerCase().includes(term))
          );
          const allTermsFound = termMatches.every(Boolean);

          if (allTermsFound) {
            textMatchPassed = true;
            const firstFound = termMatches[0];
            if (firstFound) {
              matchedColInfo = {
                key: firstFound.key,
                label: firstFound.label,
                value: firstFound.value,
              };
            }
          }
        } else {
          // OR mode: Any term matches
          for (const entry of candidateEntries) {
            const lower = entry.value.toLowerCase();
            const matchedTerm = terms.find((t) => lower.includes(t));
            if (matchedTerm) {
              textMatchPassed = true;
              matchedColInfo = {
                key: entry.key,
                label: entry.label,
                value: entry.value,
              };
              break;
            }
          }
        }
      }

      // 2. Multi-Field Conditions matching (with AND / OR conjunctions)
      let conditionMatchPassed = true;
      if (activeConditions.length > 0) {
        activeConditions.forEach((c, idx) => {
          const rawVal = getRecordValue(record, c.column);
          const valStr = String(rawVal ?? '').toLowerCase();
          const targetStr = c.value.toLowerCase().trim();

          let passed = false;
          switch (c.operator) {
            case 'equals':
              passed = valStr === targetStr;
              break;
            case 'starts_with':
              passed = valStr.startsWith(targetStr);
              break;
            case 'contains':
            default:
              passed = valStr.includes(targetStr);
              break;
          }

          if (idx === 0) {
            conditionMatchPassed = passed;
          } else {
            const conj = c.conjunction || 'AND';
            if (conj === 'OR') {
              conditionMatchPassed = conditionMatchPassed || passed;
            } else {
              conditionMatchPassed = conditionMatchPassed && passed;
            }
          }

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

      // Both text query and multi-field conditions must pass
      if (textMatchPassed && conditionMatchPassed) {
        results.push({
          record,
          matchedColumn: matchedColInfo,
        });
      }
    }

    return results;
  }, [
    activeTable?.records,
    activeTable?.searchQuery,
    activeTable?.columns,
    activeTable?.searchColumn,
    activeTable?.selectedColumns,
    searchMatchMode,
    conditions,
  ]);

  const handleApplyFilterAndClose = useCallback(
    (selectedRecord?: any) => {
      if (selectedRecord && activeTable?.onSelectRow) {
        activeTable.onSelectRow(selectedRecord);
      }
      if (activeTable?.onAdvancedConditionsChange && conditions.length > 0) {
        activeTable.onAdvancedConditionsChange(
          conditions.filter((c) => c.value && c.value.trim())
        );
      }
      closeModal();
    },
    [activeTable, conditions, closeModal]
  );

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
      closeModal();
      if (item.action) {
        item.action();
      }
      if (item.href) {
        router.push(item.href);
      }
    },
    [router, closeModal]
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
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (activeTable) {
        setMode(mode === 'app' ? 'table' : 'app');
      }
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeModal}
    >
      <div
        className={cn(
          'bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-all max-h-[85vh]',
          mode === 'table' ? 'max-w-3xl' : 'max-w-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Mode Segmented Switcher (Ctrl+K App Search / Ctrl+F Table Filter) */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 select-none">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
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
              <span>App-Wide Search</span>
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

        {mode === 'table' ? (
          <div className="flex flex-col overflow-hidden">
            {/* Table Search Input Bar with AND/OR toggle, Columns Dropdown & Multi-Field */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-white">
              <Search className="w-5 h-5 text-emerald-600 shrink-0" />
              <input
                ref={tableInputRef}
                type="text"
                value={activeTable?.searchQuery || ''}
                onChange={(e) => activeTable?.onSearchChange(e.target.value)}
                placeholder={`Search ${activeTable?.tableName || 'table'} records (e.g. ele01, reliance)...`}
                className="w-full text-sm font-medium bg-transparent text-slate-900 placeholder:text-slate-400 outline-none caret-emerald-600"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedTableIndex((prev) =>
                      filteredTableRows.length > 0 ? (prev < filteredTableRows.length - 1 ? prev + 1 : 0) : 0
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedTableIndex((prev) =>
                      filteredTableRows.length > 0 ? (prev > 0 ? prev - 1 : filteredTableRows.length - 1) : 0
                    );
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const targetRecord = filteredTableRows[selectedTableIndex]?.record;
                    handleApplyFilterAndClose(targetRecord);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeModal();
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    setMode('app');
                  }
                }}
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

              {/* AND / OR Match Mode Toggle Button */}
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold select-none shrink-0">
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
                <button
                  type="button"
                  onClick={() => setSearchMatchMode('OR')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer text-xs',
                    searchMatchMode === 'OR'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="OR: Row can match ANY typed word"
                >
                  OR
                </button>
              </div>

              {/* Target Columns Dropdown (at right corner of search) */}
              {activeTable?.columns && activeTable.columns.length > 0 && (
                <div className="relative shrink-0" ref={columnDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
                    className={cn(
                      'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border select-none',
                      hasSelectedSpecificCols
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                    title="Select columns to search in"
                  >
                    <span className="max-w-[120px] truncate">{columnButtonLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isColumnDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Search Columns
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            activeTable.onSearchColumnChange?.('ALL');
                            activeTable.onSelectedColumnsChange?.(['ALL']);
                          }}
                          className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
                        >
                          Reset to All
                        </button>
                      </div>

                      {/* All Columns Option */}
                      <button
                        type="button"
                        onClick={() => {
                          activeTable.onSearchColumnChange?.('ALL');
                          activeTable.onSelectedColumnsChange?.(['ALL']);
                          setIsColumnDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left',
                          !hasSelectedSpecificCols
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'hover:bg-slate-50 text-slate-700'
                        )}
                      >
                        <span>✦ All Columns</span>
                        {!hasSelectedSpecificCols && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      {/* List of Individual Columns */}
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
                                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                                isChecked
                                  ? 'bg-emerald-50/70 text-emerald-800 font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              )}
                            >
                              <span className="truncate">{col.label}</span>
                              {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Field Filter Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setIsMultiFieldOpen((prev) => !prev);
                  if (!isMultiFieldOpen && conditions.length === 0 && activeTable?.columns?.length) {
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
                  'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border select-none shrink-0',
                  isMultiFieldOpen || conditions.some((c) => c.value.trim())
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                )}
                title="Toggle Multi-Field Column Search (query different words in specific columns)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Multi-Field</span>
                {conditions.filter((c) => c.value.trim()).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                    {conditions.filter((c) => c.value.trim()).length}
                  </span>
                )}
              </button>
            </div>

            {/* Multi-Field / Multi-Row Query Builder Panel */}
            {isMultiFieldOpen && (
              <div className="px-5 py-3 bg-slate-50/90 border-b border-slate-100 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Multi-Column Search (Diff Words in Diff Columns)</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTable?.columns?.length) {
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
                      className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Row</span>
                    </button>
                    {conditions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setConditions([])}
                        className="text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {conditions.map((cond, idx) => (
                    <div key={cond.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Conjunction connector for rows after first */}
                      {idx > 0 ? (
                        <select
                          value={cond.conjunction}
                          onChange={(e) => {
                            const val = e.target.value as 'AND' | 'OR';
                            setConditions((prev) =>
                              prev.map((c) => (c.id === cond.id ? { ...c, conjunction: val } : c))
                            );
                          }}
                          className="h-8 px-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 outline-none cursor-pointer"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      ) : (
                        <span className="w-14 text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                          Where
                        </span>
                      )}

                      {/* Column Select */}
                      <select
                        value={cond.column}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, column: val } : c))
                          );
                        }}
                        className="h-8 px-2.5 bg-white text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 outline-none cursor-pointer shadow-2xs max-w-[160px]"
                      >
                        {activeTable?.columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, operator: val } : c))
                          );
                        }}
                        className="h-8 px-2 bg-white text-slate-600 text-xs font-medium rounded-lg border border-slate-200 outline-none cursor-pointer shadow-2xs"
                      >
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="starts_with">starts with</option>
                      </select>

                      {/* Value Input */}
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((c) => (c.id === cond.id ? { ...c, value: val } : c))
                          );
                        }}
                        placeholder="Search value..."
                        className="h-8 px-3 flex-1 min-w-[120px] bg-white text-slate-900 text-xs font-medium rounded-lg border border-slate-200 outline-none focus:border-emerald-500 shadow-2xs"
                      />

                      {/* Remove row */}
                      <button
                        type="button"
                        onClick={() => {
                          setConditions((prev) => prev.filter((c) => c.id !== cond.id));
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                        title="Remove condition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Filter Preview Table */}
            {activeTable?.records && activeTable.records.length > 0 ? (
              <div className="relative overflow-hidden flex flex-col">
                {filteredTableRows.length > 0 ? (
                  <div className="overflow-x-auto max-h-[42vh] overflow-y-auto divide-y divide-slate-100">
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
                            {activeTable?.searchQuery || conditions.some((c) => c.value.trim())
                              ? 'Matched In'
                              : activeTable?.columns[3]?.label || 'Status'}
                          </th>
                          <th className="w-20 px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredTableRows.map((row, idx) => {
                          const isSelected = idx === selectedTableIndex;
                          return (
                            <tr
                              key={row.record.id || idx}
                              onClick={() => handleApplyFilterAndClose(row.record)}
                              onMouseEnter={() => setSelectedTableIndex(idx)}
                              className={cn(
                                'transition-colors duration-75 cursor-pointer group',
                                isSelected
                                  ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                                  : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                              )}
                            >
                              {primaryCols.map((col) => {
                                const val = String(getRecordValue(row.record, col.key) ?? '');
                                return (
                                  <td
                                    key={col.key}
                                    className={cn(
                                      'px-4 py-2.5 text-xs text-slate-800 font-normal truncate max-w-[180px]',
                                      isSelected && 'text-slate-950 font-medium'
                                    )}
                                  >
                                    {highlightMatch(val, activeTable?.searchQuery || '')}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-2.5 text-xs truncate max-w-[240px]">
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
                                  <span className="text-slate-400 text-xs">
                                    {activeTable?.columns[3]
                                      ? String(getRecordValue(row.record, activeTable.columns[3].key) ?? '—')
                                      : '—'}
                                  </span>
                                )}
                              </td>
                              <td className="w-20 px-3 py-2.5 text-right">
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold transition-opacity select-none',
                                    isSelected
                                      ? 'bg-emerald-600 text-white shadow-2xs opacity-100'
                                      : 'opacity-0 group-hover:opacity-70 text-slate-500 bg-slate-100'
                                  )}
                                >
                                  Enter ↵
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : activeTable?.searchQuery.trim() || conditions.some((c) => c.value.trim()) ? (
                  <div className="py-10 px-6 flex flex-col items-center justify-center text-center">
                    <div className="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 shadow-2xs">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      No records found matching your search
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Check your spelling, try toggling to &ldquo;OR&rdquo; mode, or select &ldquo;✦ All Columns&rdquo; in the top-right dropdown.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        activeTable?.onSearchChange('');
                        setConditions([]);
                        tableInputRef.current?.focus();
                      }}
                      className="mt-3.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  /* Nothing typed prompt (USER REQUIREMENT: don't show anything when nothing is typed) */
                  <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                    <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 shadow-2xs">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Type above to search {activeTable?.tableName || 'table'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Filter by code, name, client, or script. Use the Columns dropdown on the right or click Multi-Field for multi-column search.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback if records are still loading */
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 shadow-2xs">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeTable?.searchQuery
                    ? `Filtering "${activeTable.searchQuery}" in ${activeTable.tableName}`
                    : `Filtering ${activeTable?.tableName || 'Current Table'}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                  Press Enter or click below to view the filtered table on the main page.
                </p>

                <div className="flex items-center gap-3 mt-6">
                  {activeTable?.searchQuery && (
                    <button
                      type="button"
                      onClick={() => activeTable.onSearchChange('')}
                      className="h-8.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                    >
                      Clear Filter
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleApplyFilterAndClose()}
                    className="h-8.5 px-5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <span>Apply & View Table</span>
                    <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-700/60 text-white font-bold">
                      Enter ↵
                    </kbd>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Bar for Table Filter */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                    ↑↓
                  </kbd>
                  <span>navigate rows</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                    ↵
                  </kbd>
                  <span>show on page</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                    tab
                  </kbd>
                  <span>switch to app search</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                    esc
                  </kbd>
                  <span>dismiss</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {activeTable?.records && (
                  <span className="text-slate-500 font-sans font-semibold">
                    {activeTable.searchQuery || conditions.some((c) => c.value.trim())
                      ? `${filteredTableRows.length} match${filteredTableRows.length === 1 ? '' : 'es'} in ${activeTable.tableName}`
                      : `${activeTable.records.length} total records in ${activeTable.tableName}`}
                  </span>
                )}
                {(activeTable?.searchQuery || conditions.some((c) => c.value.trim())) && (
                  <button
                    type="button"
                    onClick={() => {
                      activeTable?.onSearchChange('');
                      setConditions([]);
                      tableInputRef.current?.focus();
                    }}
                    className="text-slate-500 hover:text-slate-900 underline text-xs cursor-pointer font-medium"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
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
      </>
    )}
  </div>
</div>,
    document.body
  );
}
