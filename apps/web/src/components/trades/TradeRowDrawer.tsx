'use client';

import React from 'react';
import { X, AlertTriangle, Building2, TrendingUp, Calendar, DollarSign, Edit3 } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { formatExpiryForInput, generateDubaiSecurityName } from './tradeImportHelpers';
import { useScrollLock } from '../../hooks/useScrollLock';
import type { DubaiParsedTrade } from '../../lib/tradeParser';

interface TradeRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDubai: boolean;
  row: any; // DubaiParsedTrade or PreviewRow
  rowIndex: number;
  onSaveDubaiCell?: (index: number, field: keyof DubaiParsedTrade, value: string) => void;
  onSaveNormalCell?: (index: number, field: string, value: any) => void;
  clients: any[];
  exchanges: any[];
  scripts: any[];
  validation?: {
    isValid: boolean;
    errors: string[];
    resolvedClientId?: string;
    resolvedScriptId?: string;
    resolvedExchangeId?: string;
    dealerCode?: string;
  };
  onDoubleClickClient?: (code: string) => void;
  onDoubleClickScript?: (shortName: string, fullName: string, exchange: string, marketLot?: any, currencyCode?: string) => void;
  onDoubleClickExchange?: (code: string) => void;
}

export function TradeRowDrawer({
  isOpen,
  onClose,
  isDubai,
  row,
  rowIndex,
  onSaveDubaiCell,
  onSaveNormalCell,
  clients,
  exchanges,
  scripts,
  validation,
  onDoubleClickClient,
  onDoubleClickScript,
  onDoubleClickExchange,
}: TradeRowDrawerProps) {
  useScrollLock(isOpen);

  if (!isOpen || !row) return null;

  const clientOptions = clients.map((c) => ({ value: c.code, label: `${c.code} (${c.name})` }));
  const exchangeOptions = exchanges.map((ex) => ({ value: ex.code, label: `${ex.code} ${ex.name ? `(${ex.name})` : ''}` }));
  const scriptOptions = scripts.map((s) => ({ value: s.shortName, label: `${s.shortName} ${s.fullName ? `(${s.fullName})` : ''}` }));

  const handleChange = (field: string, value: any) => {
    if (isDubai && onSaveDubaiCell) {
      onSaveDubaiCell(rowIndex, field as keyof DubaiParsedTrade, String(value));
    } else if (onSaveNormalCell) {
      onSaveNormalCell(rowIndex, field, value);
    }
  };

  const isValid = isDubai ? validation?.isValid : row.status === 'Valid';
  const errors = isDubai ? validation?.errors || [] : row.errors || [];

  const targetTick = isDubai ? row.tickCode : row.scriptShortName;
  const scriptObj = scripts.find((s) => s.shortName.toUpperCase() === (targetTick || '').toUpperCase());
  const generatedSecName = isDubai ? generateDubaiSecurityName(row, scriptObj) : null;
  const displaySecName = generatedSecName || row.securityName || '';

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100/60 rounded-lg text-emerald-700">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Row #{rowIndex + 1} Inspector</span>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isValid ? '✓ Valid' : '⚠ Action Required'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isDubai ? 'Dubai FnO Trade Record' : 'Standard FnO Trade Record'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Errors Banner if any */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Validation Issues:</div>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {errors.map((err: string, idx: number) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Identifiers & Entities */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
              <Building2 className="w-3.5 h-3.5" /> Parties & Symbols
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Code <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={clientOptions}
                  value={isDubai ? row.clientCode : row.clientCode}
                  onChange={(val) => handleChange('clientCode', val)}
                  onDoubleClick={() => onDoubleClickClient?.(isDubai ? row.clientCode : row.clientCode)}
                  onAddClick={() => onDoubleClickClient?.(isDubai ? row.clientCode : row.clientCode)}
                  addLabel="Add Client"
                  className={`input text-xs ${
                    (isDubai ? !validation?.resolvedClientId : !row.resolvedAccountId)
                      ? 'border-rose-300 text-rose-600 font-bold bg-rose-50/50'
                      : ''
                  }`}
                  placeholder="Select Client"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Script / Symbol <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={scriptOptions}
                  value={isDubai ? row.tickCode : row.scriptShortName}
                  onChange={(val) => handleChange(isDubai ? 'tickCode' : 'scriptShortName', val)}
                  onDoubleClick={() =>
                    onDoubleClickScript?.(
                      isDubai ? row.tickCode : row.scriptShortName,
                      isDubai ? row.securityName : row.scriptFullName,
                      isDubai ? row.marketCode : row.exchange,
                      isDubai ? row.marketLot : undefined,
                      isDubai ? row.currencyCode : undefined
                    )
                  }
                  onAddClick={() =>
                    onDoubleClickScript?.(
                      isDubai ? row.tickCode : row.scriptShortName,
                      isDubai ? row.securityName : row.scriptFullName,
                      isDubai ? row.marketCode : row.exchange,
                      isDubai ? row.marketLot : undefined,
                      isDubai ? row.currencyCode : undefined
                    )
                  }
                  addLabel="Add Script"
                  className={`input text-xs ${
                    (isDubai ? !validation?.resolvedScriptId : !row.resolvedScriptId)
                      ? 'border-rose-300 text-rose-600 font-bold bg-rose-50/50'
                      : ''
                  }`}
                  placeholder="Select Script"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Market / Exchange <span className="text-rose-500">*</span>
                </label>
                {isDubai ? (
                  <SearchableSelect
                    options={exchangeOptions}
                    value={row.marketCode}
                    onChange={(val) => handleChange('marketCode', val)}
                    onDoubleClick={() => onDoubleClickExchange?.(row.marketCode)}
                    onAddClick={() => onDoubleClickExchange?.(row.marketCode)}
                    addLabel="Add Exchange"
                    className={`input text-xs ${
                      !validation?.resolvedExchangeId ? 'border-rose-300 text-rose-600 font-bold bg-rose-50/50' : ''
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    value={row.exchange || ''}
                    onChange={(e) => handleChange('exchange', e.target.value)}
                    className="input text-xs"
                  />
                )}
              </div>

              {isDubai && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dealer Code</label>
                  <input
                    type="text"
                    value={validation?.dealerCode || '-'}
                    readOnly
                    className="input text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              )}
            </div>

            {isDubai && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Security Full Name</label>
                <input
                  type="text"
                  value={displaySecName}
                  onChange={(e) => handleChange('securityName', e.target.value)}
                  className="input text-xs font-medium font-bold text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Section 2: Order & Pricing Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Order & Execution
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Side</label>
                <select
                  value={isDubai ? row.buySellFlag : row.buySell}
                  onChange={(e) => handleChange(isDubai ? 'buySellFlag' : 'buySell', e.target.value)}
                  className="input text-xs font-bold"
                >
                  <option value="Buy">Buy / Long</option>
                  <option value="Sell">Sell / Short</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={isDubai ? row.qty : row.quantity}
                  onChange={(e) =>
                    handleChange(isDubai ? 'qty' : 'quantity', isDubai ? e.target.value : Number(e.target.value))
                  }
                  className="input text-xs font-mono font-bold text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price / Rate <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={isDubai ? row.price : row.rate}
                  onChange={(e) =>
                    handleChange(isDubai ? 'price' : 'rate', isDubai ? e.target.value : Number(e.target.value))
                  }
                  className="input text-xs font-mono font-bold text-right"
                />
              </div>
            </div>

            {isDubai && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Market Lot</label>
                  <input
                    type="number"
                    value={row.marketLot || ''}
                    onChange={(e) => handleChange('marketLot', e.target.value)}
                    className="input text-xs font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Call / Put</label>
                  <select
                    value={row.callPut}
                    onChange={(e) => handleChange('callPut', e.target.value)}
                    className="input text-xs"
                  >
                    <option value="Future">Future</option>
                    <option value="Options">Options</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Strike Price</label>
                  <input
                    type="number"
                    step="any"
                    value={row.strikePrice || ''}
                    onChange={(e) => handleChange('strikePrice', e.target.value)}
                    className="input text-xs font-mono text-right"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Dates & Expiry */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
              <Calendar className="w-3.5 h-3.5" /> Dates & Expiry
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Date</label>
                <CustomDatePicker
                  value={isDubai ? row.tradeDate || '' : formatExpiryForInput(row.tradeDate)}
                  onChange={(val) => handleChange('tradeDate', val)}
                  placeholder="Select Trade Date"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                <CustomDatePicker
                  value={isDubai ? row.expiryDate || '' : formatExpiryForInput(row.expiry)}
                  onChange={(val) => handleChange(isDubai ? 'expiryDate' : 'expiry', val)}
                  placeholder="Select Expiry Date"
                />
              </div>
            </div>

            {isDubai && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Month</label>
                  <input
                    type="text"
                    value={row.delMonth || ''}
                    onChange={(e) => handleChange('delMonth', e.target.value)}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={row.currencyCode || ''}
                    onChange={(e) => handleChange('currencyCode', e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Charges & Financials (Dubai Specific) */}
          {isDubai && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                <DollarSign className="w-3.5 h-3.5" /> Financials & Orders
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Market Value</label>
                  <input
                    type="number"
                    step="any"
                    value={row.mktValue || ''}
                    onChange={(e) => handleChange('mktValue', e.target.value)}
                    className="input text-xs font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commission</label>
                  <input
                    type="number"
                    step="any"
                    value={row.clnCommission || ''}
                    onChange={(e) => handleChange('clnCommission', e.target.value)}
                    className="input text-xs font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ex Charges</label>
                  <input
                    type="number"
                    step="any"
                    value={row.clnExCharges || ''}
                    onChange={(e) => handleChange('clnExCharges', e.target.value)}
                    className="input text-xs font-mono text-right"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn--primary py-2 px-5 text-xs font-semibold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
