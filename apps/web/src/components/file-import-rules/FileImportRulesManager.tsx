'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, Plus, Edit2, Trash2, CheckCircle2, ChevronRight,
  Save, X, RefreshCw, Sliders, Database, Percent, Ban, ArrowLeftRight,
  Search, Sparkles, Tag, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { apiFetch } from '@/utils/apiClient';
import { useTopBar } from '@/context/TopBarContext';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';

interface ColumnMapping {
  id?: string;
  appField: string;
  fileColumnHeader: string | null;
  fileColumnIndex: number | null;
  alternateHeaders?: string[];
  isRequired: boolean;
  transformRule?: string | null;
}

interface OptionsFilterRule {
  enabled?: boolean;
  columnHeader?: string;
  columnIndex?: number | null;
  excludeValues?: string[];
  includeValues?: string[];
  remarksExclude?: string[];
  strikePriceColumnIndex?: number | null;
}

interface ClientSwapRule {
  enabled?: boolean;
  columnHeader?: string;
  columnIndex?: number | null;
  ignoreValues?: string[];
}

interface BrokerFeeFormula {
  mode?: 'SUM_HEADERS' | 'SINGLE_HEADER' | 'NONE';
  sumHeaders?: string[];
  singleHeader?: string;
  multiplier?: number;
}

interface FileTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  importType: 'TRADE' | 'CLOSING_RATE';
  formatType: 'CSV';
  delimiter: string;
  hasHeader: boolean;
  headerRowIndex: number;
  dataStartRow: number;
  expectedColCount: number | null;
  signatureHeaders: string[];
  optionsFilterRule: OptionsFilterRule | null;
  clientSwapRule: ClientSwapRule | null;
  brokerFeeFormula: BrokerFeeFormula | null;
  isActive: boolean;
  mappings: ColumnMapping[];
}

const TRADE_APP_FIELDS = [
  { field: 'clientCode', label: 'Client Code', required: true, description: 'Client party/account identifier' },
  { field: 'tradeDate', label: 'Trade Date', required: true, description: 'Date the trade occurred' },
  { field: 'marketCode', label: 'Market / Exchange Code', required: true, description: 'Exchange code (CME, SGX, LME)' },
  { field: 'tickCode', label: 'Commodity / Script Code', required: true, description: 'Script symbol or tick code' },
  { field: 'buySell', label: 'Buy / Sell Direction', required: true, description: 'B/S flag or Buy/Sell indicator' },
  { field: 'quantity', label: 'Quantity / Lots', required: true, description: 'Traded volume or lot size' },
  { field: 'price', label: 'Price / Rate', required: true, description: 'Trade execution price' },
  { field: 'securityName', label: 'Security Name', required: false, description: 'Full contract/security name' },
  { field: 'typeCode', label: 'Type Code', required: false, description: 'Record type indicator (e.g. FUTURE)' },
  { field: 'groupCode', label: 'Group Code', required: false, description: 'Optional broker group code' },
  { field: 'tradeTime', label: 'Trade Time', required: false, description: 'Execution time stamp' },
  { field: 'orderId', label: 'Order / Ref Number', required: false, description: 'Exchange order or reference ID' },
  { field: 'expiryDate', label: 'Expiry Date', required: false, description: 'Contract expiration date' },
  { field: 'delMonth', label: 'Delivery Month', required: false, description: 'Contract delivery month' },
  { field: 'marketLot', label: 'Market Lot / Lot Size', required: false, description: 'Units per contract lot' },
  { field: 'callPut', label: 'Call / Put Flag', required: false, description: 'Options Call/Put designation' },
  { field: 'strikePrice', label: 'Strike Price', required: false, description: 'Options contract strike rate' },
  { field: 'clnCommission', label: 'Client Commission', required: false, description: 'Primary broker commission charge' },
  { field: 'clnExCharges', label: 'Exchange Charges', required: false, description: 'Exchange levy charge' },
  { field: 'clnCharges1', label: 'Clearing Charges 1', required: false, description: 'Regulatory charge 1' },
  { field: 'clnCharges2', label: 'Clearing Charges 2', required: false, description: 'Regulatory charge 2' },
  { field: 'currency', label: 'Currency Code', required: false, description: 'Currency (USD, AED, INR)' },
  { field: 'tradeValue', label: 'Market / Trade Value', required: false, description: 'Calculated notional trade value' },
  { field: 'substituteClientCode', label: 'Substitute Client Code', required: false, description: 'Trailing column for swapped client codes' },
];

const CLOSING_RATE_APP_FIELDS = [
  { field: 'exchangeCode', label: 'Exchange Code', required: true, description: 'Exchange identifier (e.g. SGX, CME)' },
  { field: 'commodityCode', label: 'Commodity / Script Code', required: true, description: 'Commodity/script code matching DB' },
  { field: 'closingPrice', label: 'Closing Price', required: true, description: 'Daily settlement closing rate' },
  { field: 'expiryDate', label: 'Expiry Date', required: false, description: 'Contract expiry date' },
  { field: 'delMonth', label: 'Delivery Month', required: false, description: 'Contract delivery month' },
  { field: 'callPut', label: 'Call / Put Flag', required: false, description: 'Options flag (Call/Put)' },
  { field: 'futureOption', label: 'Future / Option Type', required: false, description: 'Instrument type (FUTCOM, OPTCOM)' },
  { field: 'strikePrice', label: 'Strike Price', required: false, description: 'Options strike rate' },
  { field: 'clientCode', label: 'Client Code', required: false, description: 'Used for position reconciliation' },
  { field: 'netLots', label: 'Net Open Lots', required: false, description: 'Broker open position net quantity' },
  { field: 'boughtLots', label: 'Bought Lots', required: false, description: 'Gross open buy quantity' },
  { field: 'soldLots', label: 'Sold Lots', required: false, description: 'Gross open sell quantity' },
  { field: 'currencyCode', label: 'Currency', required: false, description: 'Currency code (USD, AED, INR)' },
];

const TRANSFORM_RULES = [
  { value: '', label: 'None (Raw Text)' },
  { value: 'DATE_DD_MMM_YY', label: 'Date (DD-MMM-YY)' },
  { value: 'DATE_MM_DD_YYYY', label: 'Date (MM/DD/YYYY)' },
  { value: 'DATE_DD_MM_YYYY', label: 'Date (DD/MM/YYYY)' },
  { value: 'BUY_SELL', label: 'Buy / Sell Flag' },
  { value: 'FLOAT', label: 'Numeric / Float' },
];

// Reusable tag-chip editor for rule arrays (exclude values, swap ignores, brokerage sum headers, etc.)
function TagChipEditor({
  label,
  helper,
  values,
  isEditing,
  onChange,
  placeholder,
  badgeClassName = 'bg-blue-50 text-[#1D4ED8] border-blue-200',
  emptyText = 'None configured',
  uppercase = true,
}: {
  label: string;
  helper?: string;
  values: string[];
  isEditing: boolean;
  onChange: (next: string[]) => void;
  placeholder?: string;
  badgeClassName?: string;
  emptyText?: string;
  uppercase?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const addValues = () => {
    const tokens = draft
      .split(',')
      .map((s) => (uppercase ? s.trim().toUpperCase() : s.trim()))
      .filter(Boolean);
    if (tokens.length === 0) return;
    const next = Array.from(new Set([...values, ...tokens]));
    onChange(next);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        {helper && <span className="text-[11px] text-slate-400">{helper}</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-8 p-2 rounded-xl border border-slate-200 bg-slate-50/60 items-center">
        {values.length === 0 ? (
          <span className="text-[11px] text-slate-400 italic px-1">{emptyText}</span>
        ) : (
          values.map((val) => (
            <span
              key={val}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border shadow-2xs',
                badgeClassName
              )}
            >
              <span>{val}</span>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onChange(values.filter((v) => v !== val))}
                  className="hover:opacity-70 cursor-pointer ml-0.5"
                  title={`Remove ${val}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {isEditing && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addValues();
              }
            }}
            placeholder={placeholder || 'Type value(s) comma-separated and press Enter...'}
            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2652C8] focus:border-[#2652C8]"
          />
          <button
            type="button"
            onClick={addValues}
            className="h-8 px-2.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2652C8] border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function FileImportRulesManager({ initialTemplates }: { initialTemplates: FileTemplate[] }) {
  const { setTopBar, resetTopBar } = useTopBar();

  const [templates, setTemplates] = useState<FileTemplate[]>(initialTemplates || []);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplates?.[0]?.id || null
  );
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TRADE' | 'CLOSING_RATE'>('ALL');
  const [sectionTab, setSectionTab] = useState<'RULES' | 'MAPPINGS' | 'FORMAT'>('RULES');
  const [mappingSearch, setMappingSearch] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<FileTemplate>>({});

  // Create New Template modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    code: string;
    importType: 'TRADE' | 'CLOSING_RATE';
    description: string;
  }>({ name: '', code: '', importType: 'TRADE', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<FileTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const filteredTemplates = useMemo(() => {
    if (typeFilter === 'ALL') return templates;
    return templates.filter((t) => t.importType === typeFilter);
  }, [templates, typeFilter]);

  const startEditing = useCallback((template: FileTemplate) => {
    const brokerRule: BrokerFeeFormula = template.brokerFeeFormula
      ? JSON.parse(JSON.stringify(template.brokerFeeFormula))
      : {
          mode: template.importType === 'TRADE' ? 'SUM_HEADERS' : 'NONE',
          sumHeaders: [],
          singleHeader: '',
          multiplier: 1,
        };

    if (!brokerRule.mode) {
      brokerRule.mode = brokerRule.sumHeaders?.length
        ? 'SUM_HEADERS'
        : brokerRule.singleHeader
        ? 'SINGLE_HEADER'
        : 'NONE';
    }

    const optRule: OptionsFilterRule = template.optionsFilterRule
      ? JSON.parse(JSON.stringify(template.optionsFilterRule))
      : {
          enabled: false,
          columnHeader: '',
          columnIndex: null,
          excludeValues: [],
          includeValues: [],
          remarksExclude: [],
          strikePriceColumnIndex: null,
        };
    if (optRule.enabled === undefined) {
      optRule.enabled = Boolean(
        optRule.columnHeader ||
          optRule.excludeValues?.length ||
          optRule.includeValues?.length ||
          optRule.remarksExclude?.length
      );
    }

    const swapRule: ClientSwapRule = template.clientSwapRule
      ? JSON.parse(JSON.stringify(template.clientSwapRule))
      : {
          enabled: false,
          columnHeader: '',
          columnIndex: null,
          ignoreValues: [],
        };
    if (swapRule.enabled === undefined) {
      swapRule.enabled = Boolean(
        swapRule.columnHeader || swapRule.columnIndex !== undefined || swapRule.ignoreValues?.length
      );
    }

    setEditFormData({
      name: template.name,
      code: template.code,
      description: template.description || '',
      delimiter: template.delimiter || ',',
      hasHeader: template.hasHeader ?? true,
      headerRowIndex: template.headerRowIndex ?? 0,
      dataStartRow: template.dataStartRow ?? 1,
      expectedColCount: template.expectedColCount ?? null,
      isActive: template.isActive ?? true,
      signatureHeaders: [...(template.signatureHeaders || [])],
      mappings: JSON.parse(JSON.stringify(template.mappings || [])),
      optionsFilterRule: optRule,
      clientSwapRule: swapRule,
      brokerFeeFormula: brokerRule,
    });
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditFormData({});
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!activeTemplate) return;
    if (!editFormData.name?.trim()) {
      toast.error('Template name cannot be empty');
      return;
    }
    if (!editFormData.code?.trim()) {
      toast.error('Template code cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch(`/file-import-templates/${activeTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update template rules');
      }

      const updated: FileTemplate = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setIsEditing(false);
      toast.success('File import rules, brokerage formula & column mappings saved to DB!');
    } catch (err: any) {
      toast.error(err.message || 'Error updating template');
    } finally {
      setIsSaving(false);
    }
  }, [activeTemplate, editFormData]);

  // TopBar integration
  useEffect(() => {
    setTopBar({
      title: 'File Import Rules',
      actions: (
        <div className="flex items-center gap-2">
          {!isEditing && (
            <UniversalTooltip content="Create a new CSV import format template">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#2652C8]" />
                <span>New Template</span>
              </button>
            </UniversalTooltip>
          )}
          {activeTemplate && !isEditing && (
            <UniversalTooltip content="Edit exclusion, client swap, brokerage & column rules">
              <button
                type="button"
                onClick={() => startEditing(activeTemplate)}
                className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Rules</span>
              </button>
            </UniversalTooltip>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="h-9 px-4 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      ),
    });
    return () => resetTopBar();
  }, [setTopBar, resetTopBar, activeTemplate, isEditing, isSaving, startEditing, cancelEditing, handleSaveTemplate]);

  const handleUpdateMapping = (appField: string, fieldKey: keyof ColumnMapping, value: any) => {
    setEditFormData((prev) => {
      const mappings = [...(prev.mappings || [])];
      const idx = mappings.findIndex((m) => m.appField === appField);
      if (idx !== -1) {
        mappings[idx] = { ...mappings[idx], [fieldKey]: value };
      } else {
        mappings.push({
          appField,
          fileColumnHeader: fieldKey === 'fileColumnHeader' ? value : null,
          fileColumnIndex: fieldKey === 'fileColumnIndex' ? value : null,
          alternateHeaders: fieldKey === 'alternateHeaders' ? value : [],
          transformRule: fieldKey === 'transformRule' ? value : null,
          isRequired: fieldKey === 'isRequired' ? Boolean(value) : false,
        });
      }
      return { ...prev, mappings };
    });
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error('Template Name and Code are required');
      return;
    }
    setIsCreating(true);
    try {
      const res = await apiFetch('/file-import-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          code: createForm.code.trim().toUpperCase(),
          importType: createForm.importType,
          description: createForm.description.trim() || null,
          optionsFilterRule: { enabled: false, excludeValues: [], includeValues: [], remarksExclude: [] },
          clientSwapRule: { enabled: false, ignoreValues: [] },
          brokerFeeFormula:
            createForm.importType === 'TRADE'
              ? { mode: 'SINGLE_HEADER', singleHeader: 'BROKERAGE', sumHeaders: [] }
              : null,
          mappings: [],
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.message || 'Failed to create template');

      setTemplates((prev) => [...prev, created]);
      setSelectedTemplateId(created.id);
      setIsCreateOpen(false);
      setCreateForm({ name: '', code: '', importType: 'TRADE', description: '' });
      toast.success(`Template "${created.name}" created. You can now edit its rules and columns.`);
      startEditing(created);
    } catch (err: any) {
      toast.error(err.message || 'Could not create template');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/file-import-templates/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      const remaining = templates.filter((t) => t.id !== deleteTarget.id);
      setTemplates(remaining);
      if (selectedTemplateId === deleteTarget.id) {
        setSelectedTemplateId(remaining[0]?.id || null);
      }
      setDeleteTarget(null);
      toast.success(`Template "${deleteTarget.name}" moved to Recycle Bin.`);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentData = isEditing ? (editFormData as FileTemplate) : activeTemplate;
  const appFieldsBase = currentData?.importType === 'CLOSING_RATE' ? CLOSING_RATE_APP_FIELDS : TRADE_APP_FIELDS;

  const filteredAppFields = useMemo(() => {
    const q = mappingSearch.trim().toLowerCase();
    if (!q) return appFieldsBase;
    return appFieldsBase.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.field.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    );
  }, [appFieldsBase, mappingSearch]);

  const optRule: OptionsFilterRule = currentData?.optionsFilterRule || {};
  const swapRule: ClientSwapRule = currentData?.clientSwapRule || {};
  const brkRule: BrokerFeeFormula = currentData?.brokerFeeFormula || {};

  return (
    <div className="space-y-5">
      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Templates Directory */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
          {/* Type Filter Pills */}
          <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-1 select-none">
            {(['ALL', 'TRADE', 'CLOSING_RATE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                  typeFilter === t
                    ? 'bg-blue-50 text-[#2652C8] border border-blue-200/80 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
              >
                {t === 'ALL' ? `All (${templates.length})` : t === 'TRADE' ? 'Trades' : 'Closing Rates'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              const isTrade = tpl.importType === 'TRADE';
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    if (isEditing && tpl.id !== selectedTemplateId) {
                      toast.warning('Please Save or Cancel your edits before switching templates.');
                      return;
                    }
                    setSelectedTemplateId(tpl.id);
                  }}
                  className={cn(
                    'p-4 rounded-2xl border transition-all cursor-pointer relative group',
                    isSelected
                      ? 'bg-white border-[#2652C8]/60 shadow-sm ring-2 ring-blue-100'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border',
                        isTrade
                          ? 'bg-blue-50 text-[#2652C8] border-blue-200/80'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      )}
                    >
                      {isTrade ? 'Trade Import' : 'Closing Rate'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          tpl.isActive !== false ? 'bg-emerald-500' : 'bg-slate-300'
                        )}
                        title={tpl.isActive !== false ? 'Active' : 'Inactive'}
                      />
                      <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {tpl.formatType}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">{tpl.name}</h3>
                  <p className="text-[11px] font-mono font-semibold text-[#2652C8] mt-0.5">{tpl.code}</p>

                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}

                  {/* Quick Rule Indicators */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-2 font-medium">
                      <span>{tpl.mappings?.length || 0} cols</span>
                      {isTrade && tpl.brokerFeeFormula && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200/70 text-[10px] font-semibold">
                          Brk Rule
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 transition-transform',
                        isSelected ? 'text-[#2652C8] translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Workspace */}
        <div className="lg:col-span-8 xl:col-span-9">
          {currentData ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* Template Summary Header & Sub-Navigation Tabs */}
              <div className="px-6 pt-5 pb-0 border-b border-slate-200/80 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2652C8] flex items-center justify-center shrink-0">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900">{currentData.name}</h2>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-[#2652C8] border border-blue-200">
                          {currentData.code}
                        </span>
                        {isEditing && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Editing Mode
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentData.description || 'Configure extraction formulas, exclusion rules, client swaps, and column links.'}
                      </p>
                    </div>
                  </div>

                  {!isEditing && activeTemplate && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(activeTemplate)}
                      className="h-8 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      title="Move template to Recycle Bin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto select-none">
                  {[
                    { id: 'RULES', label: 'Business, Exclusion & Brokerage Rules', icon: Sliders },
                    { id: 'MAPPINGS', label: `Column Linkages (${currentData.mappings?.length || 0})`, icon: FileSpreadsheet },
                    { id: 'FORMAT', label: 'File Format & Auto-Detection', icon: Database },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const active = sectionTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSectionTab(tab.id as any)}
                        className={cn(
                          'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
                          active
                            ? 'border-[#2652C8] text-[#2652C8] bg-white rounded-t-xl'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
                        )}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="p-6">
                {/* ─── TAB 1: BUSINESS, EXCLUSION, SWAP & BROKERAGE RULES ────────────── */}
                {sectionTab === 'RULES' && (
                  <div className="space-y-6">
                    {/* 1. BROKERAGE RULE CARD (Trade Imports) */}
                    {currentData.importType === 'TRADE' && (
                      <div className="rounded-2xl border border-purple-200/80 bg-purple-50/20 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Percent className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Broker Fee / Brokerage Import Rule
                              </h3>
                              <p className="text-xs text-slate-500">
                                Controls how broker charges &amp; commissions are summed or extracted from CSV columns.
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-100/80 text-purple-800 border border-purple-200 self-start sm:self-auto">
                            {brkRule.mode === 'NONE'
                              ? 'Disabled (Master Rule Only)'
                              : brkRule.mode === 'SINGLE_HEADER'
                              ? 'Single Header'
                              : `Sum (${brkRule.sumHeaders?.length || 0} Columns)`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Calculation Mode
                            </label>
                            {isEditing ? (
                              <select
                                value={brkRule.mode || 'SUM_HEADERS'}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    brokerFeeFormula: {
                                      ...prev.brokerFeeFormula,
                                      mode: e.target.value as any,
                                    },
                                  }))
                                }
                                className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                              >
                                <option value="SUM_HEADERS">Sum Multiple CSV Fee Columns</option>
                                <option value="SINGLE_HEADER">Single CSV Brokerage Column</option>
                                <option value="NONE">None (No File Fee Imported)</option>
                              </select>
                            ) : (
                              <div className="text-xs font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                {brkRule.mode === 'SINGLE_HEADER'
                                  ? 'Single CSV Brokerage Column'
                                  : brkRule.mode === 'NONE'
                                  ? 'None (No File Fee Imported)'
                                  : 'Sum Multiple CSV Fee Columns'}
                              </div>
                            )}
                          </div>

                          {brkRule.mode !== 'NONE' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Multiplier
                              </label>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={brkRule.multiplier ?? 1}
                                  onChange={(e) =>
                                    setEditFormData((prev) => ({
                                      ...prev,
                                      brokerFeeFormula: {
                                        ...prev.brokerFeeFormula,
                                        multiplier: parseFloat(e.target.value) || 1,
                                      },
                                    }))
                                  }
                                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                                />
                              ) : (
                                <div className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                  × {brkRule.multiplier ?? 1}
                                </div>
                              )}
                            </div>
                          )}

                          {brkRule.mode === 'SINGLE_HEADER' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Single Brokerage Header
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={brkRule.singleHeader || ''}
                                  onChange={(e) =>
                                    setEditFormData((prev) => ({
                                      ...prev,
                                      brokerFeeFormula: {
                                        ...prev.brokerFeeFormula,
                                        singleHeader: e.target.value.toUpperCase(),
                                      },
                                    }))
                                  }
                                  placeholder="e.g. BROKERAGE"
                                  className="w-full h-9 px-3 text-xs font-mono uppercase rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                                />
                              ) : (
                                <div className="text-xs font-mono font-bold text-purple-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                  {brkRule.singleHeader || 'clnCommission mapping'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {brkRule.mode !== 'SINGLE_HEADER' && brkRule.mode !== 'NONE' && (
                          <TagChipEditor
                            label="Fee Columns to Sum for Total Broker Charges"
                            helper="Header names matched case-insensitively"
                            values={brkRule.sumHeaders || []}
                            isEditing={isEditing}
                            onChange={(next) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                brokerFeeFormula: { ...prev.brokerFeeFormula, sumHeaders: next },
                              }))
                            }
                            placeholder="e.g. CLNCOMMISSION, CLNEXCHARGES..."
                            badgeClassName="bg-purple-50 text-purple-800 border-purple-200"
                            emptyText="Uses mapped clnCommission column directly"
                          />
                        )}
                      </div>
                    )}

                    {/* 2. EXCLUSION & FILTERING RULE CARD */}
                    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <Ban className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">
                              Row Exclusion &amp; Options Filter Rules
                            </h3>
                            <p className="text-xs text-slate-500">
                              Define which rows (e.g. Options P/C, Expired settlements, OPTCOM) to automatically exclude during import.
                            </p>
                          </div>
                        </div>

                        {isEditing ? (
                          <CustomCheckbox
                            checked={optRule.enabled !== false}
                            onChange={(checked) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                optionsFilterRule: { ...prev.optionsFilterRule, enabled: checked },
                              }))
                            }
                            label="Filter Active"
                          />
                        ) : (
                          <span
                            className={cn(
                              'text-[11px] font-bold px-2.5 py-1 rounded-lg border',
                              optRule.enabled !== false &&
                                (optRule.columnHeader || optRule.excludeValues?.length || optRule.includeValues?.length || optRule.remarksExclude?.length)
                                ? 'bg-rose-100/80 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            )}
                          >
                            {optRule.enabled !== false &&
                            (optRule.columnHeader || optRule.excludeValues?.length || optRule.includeValues?.length || optRule.remarksExclude?.length)
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Target Filter Column Header
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={optRule.columnHeader || ''}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  optionsFilterRule: {
                                    ...prev.optionsFilterRule,
                                    columnHeader: e.target.value,
                                  },
                                }))
                              }
                              placeholder="e.g. CALLPUT or InstTypeCode"
                              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                            />
                          ) : (
                            <div className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                              {optRule.columnHeader || '—'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Fallback Column Index (0-based)
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              value={optRule.columnIndex ?? ''}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  optionsFilterRule: {
                                    ...prev.optionsFilterRule,
                                    columnIndex: e.target.value === '' ? null : parseInt(e.target.value, 10),
                                  },
                                }))
                              }
                              placeholder="e.g. 10"
                              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                            />
                          ) : (
                            <div className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                              {optRule.columnIndex !== null && optRule.columnIndex !== undefined
                                ? `Col ${optRule.columnIndex}`
                                : 'Header Match Only'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Strike Price Column Index
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              value={optRule.strikePriceColumnIndex ?? ''}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  optionsFilterRule: {
                                    ...prev.optionsFilterRule,
                                    strikePriceColumnIndex:
                                      e.target.value === '' ? null : parseInt(e.target.value, 10),
                                  },
                                }))
                              }
                              placeholder="Optional (e.g. 12)"
                              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                            />
                          ) : (
                            <div className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                              {optRule.strikePriceColumnIndex !== null &&
                              optRule.strikePriceColumnIndex !== undefined
                                ? `Col ${optRule.strikePriceColumnIndex}`
                                : 'Not Checked'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TagChipEditor
                          label="Values to Exclude (Skip Row)"
                          helper="Exact match on filter column"
                          values={optRule.excludeValues || []}
                          isEditing={isEditing}
                          onChange={(next) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              optionsFilterRule: { ...prev.optionsFilterRule, excludeValues: next },
                            }))
                          }
                          placeholder="e.g. OPTIONS, P, C, OPTCOM"
                          badgeClassName="bg-rose-50 text-rose-800 border-rose-200"
                          emptyText="No excluded values"
                        />

                        <TagChipEditor
                          label="Include Only Values (Allowlist)"
                          helper="Leave empty to allow all non-excluded"
                          values={optRule.includeValues || []}
                          isEditing={isEditing}
                          onChange={(next) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              optionsFilterRule: { ...prev.optionsFilterRule, includeValues: next },
                            }))
                          }
                          placeholder="e.g. FUTCOM"
                          badgeClassName="bg-emerald-50 text-emerald-800 border-emerald-200"
                          emptyText="Allow all non-excluded values"
                        />
                      </div>

                      <TagChipEditor
                        label="Exclude Rows Containing Keywords (Remarks / Line Match)"
                        helper="Skips any row whose line contains these words"
                        values={optRule.remarksExclude || []}
                        isEditing={isEditing}
                        onChange={(next) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            optionsFilterRule: { ...prev.optionsFilterRule, remarksExclude: next },
                          }))
                        }
                        placeholder="e.g. EXPIRE, CANCELLED"
                        badgeClassName="bg-amber-50 text-amber-800 border-amber-200"
                        emptyText="No keyword exclusions configured"
                      />
                    </div>

                    {/* 3. CLIENT SWAP RULE CARD (Trade Imports) */}
                    {currentData.importType === 'TRADE' && (
                      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2652C8] flex items-center justify-center shrink-0">
                              <ArrowLeftRight className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Client Code Swapping Rule
                              </h3>
                              <p className="text-xs text-slate-500">
                                Checks a secondary or trailing CSV column and swaps the active client code when a non-ignored code appears.
                              </p>
                            </div>
                          </div>

                          {isEditing ? (
                            <CustomCheckbox
                              checked={swapRule.enabled !== false}
                              onChange={(checked) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  clientSwapRule: { ...prev.clientSwapRule, enabled: checked },
                                }))
                              }
                              label="Swap Active"
                            />
                          ) : (
                            <span
                              className={cn(
                                'text-[11px] font-bold px-2.5 py-1 rounded-lg border',
                                swapRule.enabled !== false &&
                                  (swapRule.columnHeader ||
                                    (swapRule.columnIndex !== null && swapRule.columnIndex !== undefined))
                                  ? 'bg-blue-100/80 text-[#1D4ED8] border-blue-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              )}
                            >
                              {swapRule.enabled !== false &&
                              (swapRule.columnHeader ||
                                (swapRule.columnIndex !== null && swapRule.columnIndex !== undefined))
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Swap Source Column Index (0-based)
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                value={swapRule.columnIndex ?? ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    clientSwapRule: {
                                      ...prev.clientSwapRule,
                                      columnIndex: e.target.value === '' ? null : parseInt(e.target.value, 10),
                                    },
                                  }))
                                }
                                placeholder="e.g. 29 (trailing column)"
                                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                              />
                            ) : (
                              <div className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                {swapRule.columnIndex !== null && swapRule.columnIndex !== undefined
                                  ? `Column Index ${swapRule.columnIndex}`
                                  : 'Not Configured'}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Swap Source Header (Optional)
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={swapRule.columnHeader || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    clientSwapRule: {
                                      ...prev.clientSwapRule,
                                      columnHeader: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Leave blank if column is unheadered"
                                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                              />
                            ) : (
                              <div className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                {swapRule.columnHeader || 'Unheadered (Index Only)'}
                              </div>
                            )}
                          </div>
                        </div>

                        <TagChipEditor
                          label="Values to Ignore (Keep Original Client Code)"
                          helper="If cell contains these words, client is NOT swapped"
                          values={swapRule.ignoreValues || []}
                          isEditing={isEditing}
                          onChange={(next) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              clientSwapRule: { ...prev.clientSwapRule, ignoreValues: next },
                            }))
                          }
                          placeholder="e.g. NORMAL, MEDIUMCARRY, FORWARD, SPOT"
                          badgeClassName="bg-blue-50 text-[#1D4ED8] border-blue-200"
                          emptyText="No ignored values (all non-empty cells swap)"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 2: DYNAMIC COLUMN LINKAGES ────────────────────────────────── */}
                {sectionTab === 'MAPPINGS' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={mappingSearch}
                          onChange={(e) => setMappingSearch(e.target.value)}
                          placeholder="Filter fields or headers..."
                          className="w-full h-8.5 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Showing <strong className="text-slate-800">{filteredAppFields.length}</strong> system fields
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4">System Field</th>
                            <th className="py-3 px-4">Primary CSV Header</th>
                            <th className="py-3 px-4">Alternate Headers</th>
                            <th className="py-3 px-4 w-24 text-center">Col Index</th>
                            <th className="py-3 px-4">Transform Rule</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAppFields.map((appField) => {
                            const mapping = (currentData.mappings || []).find(
                              (m) => m.appField === appField.field
                            );
                            const altStr = (mapping?.alternateHeaders || []).join(', ');

                            return (
                              <tr key={appField.field} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{appField.label}</span>
                                    {appField.required && (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                    {appField.field} • {appField.description}
                                  </span>
                                </td>

                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={mapping?.fileColumnHeader || ''}
                                      onChange={(e) =>
                                        handleUpdateMapping(appField.field, 'fileColumnHeader', e.target.value)
                                      }
                                      placeholder="CSV Header"
                                      className="h-8 px-2.5 text-xs font-mono w-full rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                                    />
                                  ) : mapping?.fileColumnHeader ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                                      {mapping.fileColumnHeader}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Unmapped</span>
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={altStr}
                                      onChange={(e) =>
                                        handleUpdateMapping(
                                          appField.field,
                                          'alternateHeaders',
                                          e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter(Boolean)
                                        )
                                      }
                                      placeholder="ALT_1, ALT_2"
                                      className="h-8 px-2.5 text-xs font-mono w-full rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                                    />
                                  ) : mapping?.alternateHeaders && mapping.alternateHeaders.length > 0 ? (
                                    <span className="font-mono text-[11px] text-slate-600">
                                      {mapping.alternateHeaders.join(', ')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={mapping?.fileColumnIndex ?? ''}
                                      onChange={(e) =>
                                        handleUpdateMapping(
                                          appField.field,
                                          'fileColumnIndex',
                                          e.target.value === '' ? null : parseInt(e.target.value, 10)
                                        )
                                      }
                                      placeholder="—"
                                      className="h-8 px-2 text-xs font-mono w-16 text-center rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                                    />
                                  ) : mapping?.fileColumnIndex !== null &&
                                    mapping?.fileColumnIndex !== undefined ? (
                                    <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                      {mapping.fileColumnIndex}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <select
                                      value={mapping?.transformRule || ''}
                                      onChange={(e) =>
                                        handleUpdateMapping(
                                          appField.field,
                                          'transformRule',
                                          e.target.value || null
                                        )
                                      }
                                      className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                                    >
                                      {TRANSFORM_RULES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                          {r.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : mapping?.transformRule ? (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                                      {mapping.transformRule}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">Raw</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: FORMAT & SIGNATURE HEADERS ────────────────────────────── */}
                {sectionTab === 'FORMAT' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Template Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                          />
                        ) : (
                          <div className="text-sm font-bold text-slate-900">{currentData.name}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Template Code
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.code || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })
                            }
                            className="w-full h-9 px-3 text-xs font-mono uppercase rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                          />
                        ) : (
                          <div className="text-sm font-mono font-bold text-[#2652C8]">{currentData.code}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Status
                        </label>
                        {isEditing ? (
                          <div className="pt-1.5">
                            <CustomCheckbox
                              checked={editFormData.isActive !== false}
                              onChange={(checked) =>
                                setEditFormData({ ...editFormData, isActive: checked })
                              }
                              label="Template Enabled for Imports"
                            />
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            <span>{currentData.isActive !== false ? 'Active' : 'Disabled'}</span>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Description
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.description || ''}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, description: e.target.value })
                            }
                            placeholder="Description of broker / exchange CSV format..."
                            className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                          />
                        ) : (
                          <div className="text-xs text-slate-600">{currentData.description || '—'}</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          CSV Delimiter
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.delimiter ?? ','}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, delimiter: e.target.value })
                            }
                            className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                          />
                        ) : (
                          <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            "{currentData.delimiter || ','}"
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Expected Columns
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData.expectedColCount ?? ''}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                expectedColCount: e.target.value === '' ? null : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Flexible"
                            className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                          />
                        ) : (
                          <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            {currentData.expectedColCount ?? 'Flexible'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Header Row Index
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData.headerRowIndex ?? 0}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                headerRowIndex: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                          />
                        ) : (
                          <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            Row {currentData.headerRowIndex ?? 0}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Data Start Row
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData.dataStartRow ?? 1}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                dataStartRow: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                          />
                        ) : (
                          <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            Row {currentData.dataStartRow ?? 1}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <TagChipEditor
                        label="Auto-Detection Signature Headers"
                        helper="Headers scanned during file drop to auto-select this template"
                        values={currentData.signatureHeaders || []}
                        isEditing={isEditing}
                        onChange={(next) =>
                          setEditFormData((prev) => ({ ...prev, signatureHeaders: next }))
                        }
                        placeholder="e.g. TRADETIME, EXCHORDERID, MKTVALUE"
                        badgeClassName="bg-blue-50 text-[#1D4ED8] border-blue-200"
                        emptyText="No signature headers configured"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No File Import Template Selected</p>
              <p className="text-xs text-slate-500 mt-1">
                Select a template from the left or create a new template to customize import rules.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create New Template Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Import Template</h3>
                  <p className="text-[11px] text-slate-500">Define a custom CSV import rule set</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Import Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TRADE', 'CLOSING_RATE'] as const).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, importType: tp })}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                        createForm.importType === tp
                          ? 'bg-blue-50 text-[#2652C8] border-blue-300 ring-1 ring-blue-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {tp === 'TRADE' ? 'Trade File Import' : 'Closing Rate Import'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Custom Broker Trade CSV"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Code *</label>
                <input
                  type="text"
                  required
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. CUSTOM_BROKER_CSV"
                  className="w-full h-9 px-3 text-xs font-mono uppercase rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional broker or exchange format notes..."
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#2652C8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-3.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-9 px-4 text-xs font-semibold text-white bg-[#2652C8] hover:bg-[#1F42A3] rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isCreating ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Template Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Import Template"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.code})? It will be moved to the Recycle Bin.`
            : ''
        }
        confirmLabel="Move to Recycle Bin"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
