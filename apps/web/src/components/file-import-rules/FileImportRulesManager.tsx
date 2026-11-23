'use client';

import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, Edit2, Trash2, CheckCircle2, ChevronRight, 
  ArrowLeft, Save, X, AlertCircle, RefreshCw, Sliders, Database, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

interface ColumnMapping {
  id?: string;
  appField: string;
  fileColumnHeader: string | null;
  fileColumnIndex: number | null;
  alternateHeaders?: string[];
  isRequired: boolean;
  transformRule?: string | null;
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
  optionsFilterRule: any;
  clientSwapRule: any;
  brokerFeeFormula: any;
  isActive: boolean;
  mappings: ColumnMapping[];
}

// App standard fields available for Trades and Closing Rates
const TRADE_APP_FIELDS = [
  { field: 'clientCode', label: 'Client Code', required: true, description: 'Client party/account identifier' },
  { field: 'tradeDate', label: 'Trade Date', required: true, description: 'Date the trade occurred' },
  { field: 'marketCode', label: 'Market / Exchange Code', required: true, description: 'Exchange code (CME, SGX, LME)' },
  { field: 'tickCode', label: 'Commodity / Script Code', required: true, description: 'Script symbol or tick code' },
  { field: 'typeCode', label: 'Buy / Sell Direction', required: true, description: 'B/S flag or Buy/Sell indicator' },
  { field: 'quantity', label: 'Quantity / Lots', required: true, description: 'Traded volume or lot size' },
  { field: 'rate', label: 'Price / Rate', required: true, description: 'Trade execution price' },
  { field: 'groupCode', label: 'Group Code', required: false, description: 'Optional broker group code' },
  { field: 'tradeTime', label: 'Trade Time', required: false, description: 'Execution time stamp' },
  { field: 'orderNo', label: 'Order Number', required: false, description: 'Broker order identifier' },
  { field: 'expiryDate', label: 'Expiry Date', required: false, description: 'Contract expiration date' },
  { field: 'delMonth', label: 'Delivery Month', required: false, description: 'Contract delivery month' },
  { field: 'callPut', label: 'Call / Put Flag', required: false, description: 'Options Call/Put designation' },
  { field: 'strikePrice', label: 'Strike Price', required: false, description: 'Options contract strike rate' },
  { field: 'clnCommission', label: 'Client Commission', required: false, description: 'Broker commission charge' },
  { field: 'clnExCharges', label: 'Exchange Charges', required: false, description: 'Exchange levy charge' },
  { field: 'clnCharges1', label: 'Clearing Charges 1', required: false, description: 'Regulatory charge 1' },
  { field: 'clnCharges2', label: 'Clearing Charges 2', required: false, description: 'Regulatory charge 2' },
  { field: 'orderType', label: 'Order Type', required: false, description: 'Order classification' },
  { field: 'substituteClientCode', label: 'Substitute Client Code', required: false, description: 'Trailing column for swapped client codes' },
];

const CLOSING_RATE_APP_FIELDS = [
  { field: 'exchangeCode', label: 'Exchange Code', required: true, description: 'Exchange identifier (e.g. SGX, CME)' },
  { field: 'commodityCode', label: 'Commodity / Script Code', required: true, description: 'Commodity/script code matching DB' },
  { field: 'closingPrice', label: 'Closing Price', required: true, description: 'Daily settlement closing rate' },
  { field: 'expiryDate', label: 'Expiry Date', required: false, description: 'Contract expiry date' },
  { field: 'delMonth', label: 'Delivery Month', required: false, description: 'Contract delivery month' },
  { field: 'callPut', label: 'Call / Put Flag', required: false, description: 'Options flag (Call/Put)' },
  { field: 'strikePrice', label: 'Strike Price', required: false, description: 'Options strike rate' },
  { field: 'clientCode', label: 'Client Code', required: false, description: 'Used for position reconciliation' },
  { field: 'netLots', label: 'Net Open Lots', required: false, description: 'Broker open position net quantity' },
  { field: 'currencyCode', label: 'Currency', required: false, description: 'Currency code (USD, AED, INR)' },
];

export function FileImportRulesManager({ initialTemplates }: { initialTemplates: FileTemplate[] }) {
  const [templates, setTemplates] = useState<FileTemplate[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplates[0]?.id || null
  );
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State for Active Template
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const [editFormData, setEditFormData] = useState<Partial<FileTemplate>>({});

  const startEditing = (template: FileTemplate) => {
    setEditFormData({
      name: template.name,
      code: template.code,
      description: template.description,
      delimiter: template.delimiter,
      expectedColCount: template.expectedColCount,
      mappings: JSON.parse(JSON.stringify(template.mappings)),
      optionsFilterRule: JSON.parse(JSON.stringify(template.optionsFilterRule || {})),
      clientSwapRule: JSON.parse(JSON.stringify(template.clientSwapRule || {})),
    });
    setIsEditingTemplate(true);
  };

  const cancelEditing = () => {
    setIsEditingTemplate(false);
    setEditFormData({});
  };

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
          isRequired: false,
        });
      }
      return { ...prev, mappings };
    });
  };

  const handleSaveTemplate = async () => {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/file-import-templates/${activeTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update template');
      }

      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setIsEditingTemplate(false);
      toast.success('File Import Rules & Column Mappings saved successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating template');
    } finally {
      setIsSaving(false);
    }
  };

  const appFieldsList = activeTemplate?.importType === 'TRADE' ? TRADE_APP_FIELDS : CLOSING_RATE_APP_FIELDS;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8]">
            <Sliders className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-display">File Import Rules & Column Mapping</h1>
            <p className="text-xs text-slate-500 font-medium">
              Configure CSV file templates, define which CSV column links to which system field, and adjust chargeable rules.
            </p>
          </div>
        </div>

        {activeTemplate && !isEditingTemplate && (
          <button
            type="button"
            onClick={() => startEditing(activeTemplate)}
            className="btn btn--primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Template Rules</span>
          </button>
        )}

        {isEditingTemplate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="btn btn--secondary text-xs flex items-center gap-1.5 py-2 px-3"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="btn btn--primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: List of File Templates */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Available File Templates ({templates.length})
          </h2>

          <div className="space-y-2">
            {templates.map((template) => {
              const isSelected = template.id === selectedTemplateId;
              return (
                <div
                  key={template.id}
                  onClick={() => {
                    if (isEditingTemplate) {
                      if (!confirm('Discard unsaved changes?')) return;
                      setIsEditingTemplate(false);
                    }
                    setSelectedTemplateId(template.id);
                  }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer relative",
                    isSelected
                      ? "bg-blue-50/60 border-blue-300 shadow-xs ring-1 ring-blue-500/10"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700">
                      {template.importType}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {template.formatType}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2 font-display">{template.name}</h3>
                  <p className="text-[11px] font-mono font-semibold text-blue-700 mt-0.5">{template.code}</p>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {template.description || 'No description provided.'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{template.mappings?.length || 0} Columns Mapped</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-400")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Template Configuration & Dynamic Column Mappings */}
        <div className="lg:col-span-3 space-y-5">
          {activeTemplate ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              {/* Template General Properties */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>General Template Details</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Template Name</label>
                    {isEditingTemplate ? (
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="input text-xs w-full bg-slate-50"
                      />
                    ) : (
                      <div className="text-sm font-bold text-slate-900">{activeTemplate.name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Template Code</label>
                    {isEditingTemplate ? (
                      <input
                        type="text"
                        value={editFormData.code || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                        className="input text-xs w-full bg-slate-50 font-mono"
                      />
                    ) : (
                      <div className="text-sm font-bold font-mono text-blue-700">{activeTemplate.code}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Expected Column Count</label>
                    {isEditingTemplate ? (
                      <input
                        type="number"
                        value={editFormData.expectedColCount ?? ''}
                        onChange={(e) => setEditFormData({ ...editFormData, expectedColCount: parseInt(e.target.value) || null })}
                        className="input text-xs w-full bg-slate-50 font-mono"
                        placeholder="e.g. 30"
                      />
                    ) : (
                      <div className="text-sm font-mono font-bold text-slate-900">{activeTemplate.expectedColCount ?? 'Flexible'}</div>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                    {isEditingTemplate ? (
                      <input
                        type="text"
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        className="input text-xs w-full bg-slate-50"
                        placeholder="Description of broker / exchange format"
                      />
                    ) : (
                      <div className="text-xs text-slate-600">{activeTemplate.description || '—'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Column Mappings Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Dynamic Column Linkages</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Map file headers or column indices from your CSV to system application fields.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {appFieldsList.length} Supported Fields
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">System Application Field</th>
                        <th className="py-3 px-4">Field Purpose</th>
                        <th className="py-3 px-4">Linked File Column Header</th>
                        <th className="py-3 px-4 text-center">Column Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appFieldsList.map((appField) => {
                        const currentMappings = isEditingTemplate ? (editFormData.mappings || []) : activeTemplate.mappings;
                        const mapping = currentMappings.find((m) => m.appField === appField.field);

                        return (
                          <tr key={appField.field} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{appField.label}</span>
                                {appField.required && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                    Required
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{appField.field}</span>
                            </td>

                            <td className="py-3 px-4 text-slate-500 text-xs">
                              {appField.description}
                            </td>

                            <td className="py-3 px-4">
                              {isEditingTemplate ? (
                                <input
                                  type="text"
                                  value={mapping?.fileColumnHeader || ''}
                                  onChange={(e) => handleUpdateMapping(appField.field, 'fileColumnHeader', e.target.value)}
                                  placeholder="e.g. COMMODITY_CODE"
                                  className="input text-xs py-1.5 px-2.5 w-full bg-slate-50 font-mono uppercase"
                                />
                              ) : (
                                mapping?.fileColumnHeader ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    {mapping.fileColumnHeader}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Not linked by header</span>
                                )
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isEditingTemplate ? (
                                <input
                                  type="number"
                                  value={mapping?.fileColumnIndex ?? ''}
                                  onChange={(e) => handleUpdateMapping(appField.field, 'fileColumnIndex', e.target.value === '' ? null : parseInt(e.target.value))}
                                  placeholder="0"
                                  className="input text-xs py-1.5 px-2 w-16 text-center bg-slate-50 font-mono"
                                />
                              ) : (
                                mapping?.fileColumnIndex !== null && mapping?.fileColumnIndex !== undefined ? (
                                  <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                    Col {mapping.fileColumnIndex}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chargeable / Business Rules (Options Filter & Client Swap) */}
              {activeTemplate.importType === 'TRADE' && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Configured Business & Chargeable Rules</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800">Options Exclude / Chargeable Filter</div>
                      <p className="text-slate-500 text-[11px]">
                        Identifies Options trades by column & value to exclude or route to chargeable rules.
                      </p>
                      <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100">
                        Header: <strong>{activeTemplate.optionsFilterRule?.columnHeader || 'CALLPUT'}</strong> | Exclude: <strong>{activeTemplate.optionsFilterRule?.excludeValues?.join(', ') || 'OPTIONS, P, C'}</strong>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800">Trailing Client Swapping Rule</div>
                      <p className="text-slate-500 text-[11px]">
                        Checks trailing unheadered column to substitute actual client codes.
                      </p>
                      <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100">
                        Column: <strong>Index {activeTemplate.clientSwapRule?.columnIndex ?? 29}</strong> | Ignored: <strong>{activeTemplate.clientSwapRule?.ignoreValues?.join(', ') || 'NORMAL, MEDIUMCARRY, FORWARD, SPOT'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              Select a template to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
