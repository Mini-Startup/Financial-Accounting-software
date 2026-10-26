'use client';

import React from 'react';
import { Plus, AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { generateDubaiSecurityName } from './tradeImportHelpers';
import type { DubaiParsedTrade } from '../../lib/tradeParser';
import {
  calculateTradeRates,
  calculateBrokerBrokerage,
  resolveClientRule,
  round,
} from '@/utils/brokerage';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

export interface DubaiTableRowProps {
  row: DubaiParsedTrade;
  mainIdx: number;
  relativeIdx: number;
  dubaiCurrentPage: number;
  dubaiPageSize: number;
  val: {
    isValid: boolean;
    errors: string[];
    resolvedClientId?: string;
    resolvedScriptId?: string;
    resolvedExchangeId?: string;
    resolvedCurrencyId?: string;
    dealerCode?: string;
  };
  scripts: any[];
  brokerages?: any[];
  isValidatingMasterData?: boolean;
  onToggleRow: (mainIdx: number) => void;
  onSelectRow: (mainIdx: number) => void;
  onDoubleClickClient: (code: string) => void;
  onDoubleClickScript: (
    shortName: string,
    fullName: string,
    exchangeCode: string,
    marketLot?: any,
    currencyCode?: string
  ) => void;
  onDoubleClickExchange: (code: string) => void;
  onDoubleClickCurrency: (code: string) => void;
}

export function DubaiTableRow({
  row,
  mainIdx,
  relativeIdx,
  dubaiCurrentPage,
  dubaiPageSize,
  val,
  scripts,
  brokerages,
  isValidatingMasterData = false,
  onToggleRow,
  onSelectRow,
  onDoubleClickClient,
  onDoubleClickScript,
  onDoubleClickExchange,
  onDoubleClickCurrency,
}: DubaiTableRowProps) {
  const scriptObj = scripts.find(
    (s) => s.shortName.toUpperCase() === (row.tickCode || '').toUpperCase()
  );
  const generatedSecurityName = generateDubaiSecurityName(row, scriptObj);

  const isMappedScript = Boolean(val.resolvedScriptId);
  const displaySecName = generatedSecurityName || row.securityName || row.tickCode || '—';

  const isBuy = (row.buySellFlag || '').toUpperCase().startsWith('B') || row.buySellFlag === '1';
  const side: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  const cleanTradeDate = row.tradeDate ? formatDateToDDMMYY(row.tradeDate) : '—';
  const cleanExpiryDate = row.expiryDate ? formatDateToDDMMYY(row.expiryDate) : '—';

  // ── Calculation ──────────────────────────────────────────────────────────
  const qtyNum = Math.abs(parseFloat(String(row.qty || 0))) || 0;
  const priceNum = parseFloat(String(row.price || 0)) || 0;
  const lotNum =
    row.marketLot && parseFloat(String(row.marketLot)) > 0
      ? parseFloat(String(row.marketLot))
      : 1;

  const brokerChargesSum = calculateBrokerBrokerage(
    row.clnCommission ? parseFloat(String(row.clnCommission)) : 0,
    row.clnExCharges ? parseFloat(String(row.clnExCharges)) : 0,
    row.clnCharges1 ? parseFloat(String(row.clnCharges1)) : 0,
    row.clnCharges2 ? parseFloat(String(row.clnCharges2)) : 0
  );

  const clientRule = resolveClientRule(
    brokerages,
    val.resolvedClientId,
    val.resolvedScriptId,
    side
  );

  const calc = calculateTradeRates({
    rate: priceNum,
    quantity: qtyNum,
    marketLot: lotNum,
    side,
    clientRule: clientRule
      ? {
          quantity: clientRule.quantity,
          brokerage: clientRule.brokerage,
          direction: clientRule.direction as any,
        }
      : null,
    brokerBrokerage: brokerChargesSum,
  });

  const displayMktValue =
    row.mktValue && parseFloat(String(row.mktValue)) > 0
      ? parseFloat(String(row.mktValue))
      : calc.marketValue;

  const clientRate = isBuy
    ? round(displayMktValue + calc.clientBrokerage)
    : round(displayMktValue - calc.clientBrokerage);

  const brokerRate = isBuy
    ? round(displayMktValue + calc.brokerBrokerage)
    : round(displayMktValue - calc.brokerBrokerage);

  return (
    <tr
      onClick={() => onSelectRow(mainIdx)}
      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${
        !val.isValid && !isValidatingMasterData ? 'bg-rose-50/20' : ''
      }`}
    >
      {/* Checkbox column */}
      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
        <CustomCheckbox
          checked={row.selected === true}
          onChange={() => onToggleRow(mainIdx)}
        />
      </td>

      {/* 1. # */}
      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
        {(dubaiCurrentPage - 1) * dubaiPageSize + relativeIdx + 1}
      </td>

      {/* 2. Trade Date */}
      <td className="py-3 px-3 font-mono text-slate-700">{cleanTradeDate}</td>

      {/* 3. Trade Time */}
      <td className="py-3 px-3 font-mono text-slate-600">{row.tradeTime || '—'}</td>

      {/* 4. Client */}
      <td className="py-3 px-3">
        {val.resolvedClientId || isValidatingMasterData ? (
          <span className="font-bold text-slate-800 font-mono">{row.clientCode}</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDoubleClickClient(row.clientCode);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
            title="Unmapped client. Click to create."
          >
            <span>{row.clientCode || 'Missing'}</span>
            <Plus className="w-3 h-3" />
          </button>
        )}
      </td>

      {/* 5. Dealer Code */}
      <td className="py-3 px-3 font-mono text-slate-600">{val.dealerCode || '-'}</td>

      {/* Exchange */}
      <td className="py-3 px-3">
        {val.resolvedExchangeId || isValidatingMasterData ? (
          <span className="font-mono font-bold text-slate-800">{row.marketCode || '—'}</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDoubleClickExchange(row.marketCode);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors border border-rose-200"
            title={`Unmapped Exchange '${row.marketCode}'. Click to add to database.`}
          >
            <span>{row.marketCode || 'Missing'}</span>
            <Plus className="w-3 h-3" />
          </button>
        )}
      </td>

      {/* 6. Curr */}
      <td className="py-3 px-3">
        {val.resolvedCurrencyId || isValidatingMasterData ? (
          <span className="font-mono text-slate-700 font-bold">{row.currencyCode || 'USD'}</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDoubleClickCurrency(row.currencyCode || 'USD');
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
            title="Unmapped currency. Click to add."
          >
            <span>{row.currencyCode || 'USD'}</span>
            <Plus className="w-3 h-3" />
          </button>
        )}
      </td>

      {/* 7. Security Name */}
      <td className="py-3 px-3">
        {isMappedScript || isValidatingMasterData ? (
          <div className="font-semibold text-slate-800" title={displaySecName}>
            {displaySecName}
          </div>
        ) : (
          <div
            className="font-serif italic font-semibold text-rose-600 flex items-center gap-1.5"
            title="Unmapped script raw name"
          >
            <span>{displaySecName}</span>
            <span className="not-italic text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-700 font-sans rounded font-bold">
              Unmapped
            </span>
          </div>
        )}
      </td>

      {/* 8. Del Month */}
      <td className="py-3 px-3 font-mono text-slate-600">{row.delMonth || '—'}</td>

      {/* 9. Expiry Date */}
      <td className="py-3 px-3 font-mono text-slate-600">{cleanExpiryDate}</td>

      {/* 10. Market Lot */}
      <td className="py-3 px-3 text-right font-mono text-slate-600">
        {row.marketLot ? Number(row.marketLot).toLocaleString() : '—'}
      </td>

      {/* 11. Call/Put */}
      <td className="py-3 px-3 font-semibold text-slate-700">{row.callPut || 'Future'}</td>

      {/* 12. Strike Price */}
      <td className="py-3 px-3 text-right font-mono text-slate-600">
        {row.strikePrice ? Number(row.strikePrice).toLocaleString() : '—'}
      </td>

      {/* 13. Tick Code */}
      <td className="py-3 px-3 font-mono">
        {val.resolvedScriptId || isValidatingMasterData ? (
          <span className="font-bold text-slate-800">{row.tickCode}</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDoubleClickScript(
                row.tickCode,
                row.securityName || row.tickCode,
                row.marketCode,
                row.marketLot,
                row.currencyCode
              );
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200"
          >
            <span>{row.tickCode}</span>
            <Plus className="w-3 h-3" />
          </button>
        )}
      </td>

      {/* 14. Bloomberg */}
      <td className="py-3 px-3 font-mono text-slate-600">{row.bloombergCode || '—'}</td>

      {/* 15. Side */}
      <td className="py-3 px-3 text-center">
        <span
          className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
            isBuy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {isBuy ? 'BUY' : 'SELL'}
        </span>
      </td>

      {/* 16. Qty */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
        {Number(row.qty).toLocaleString()}
      </td>

      {/* 17. Price */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
        {Number(row.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>

      {/* 18. Mkt Value - Highlighted */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-l border-r border-slate-200/80">
        {Number(displayMktValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>

      {/* 19. Client Rate - Highlighted */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
        {clientRate.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}
      </td>

      {/* 20. Broker Rate - Highlighted */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
        {brokerRate.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}
      </td>

      {/* 21. Client Brokerage - Highlighted */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
        {calc.clientBrokerage > 0 ? calc.clientBrokerage.toFixed(2) : '0.00'}
      </td>

      {/* 22. Broker Brokerage - Highlighted */}
      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/90 group-hover:bg-slate-200/60 border-r border-slate-200/80">
        {calc.brokerBrokerage > 0 ? calc.brokerBrokerage.toFixed(2) : '0.00'}
      </td>

      {/* 23. Commission */}
      <td className="py-3 px-3 text-right font-mono text-slate-600">
        {row.clnCommission ? Number(row.clnCommission).toFixed(2) : '—'}
      </td>

      {/* 24. Ex Charges */}
      <td className="py-3 px-3 text-right font-mono text-slate-600">
        {row.clnExCharges ? Number(row.clnExCharges).toFixed(2) : '—'}
      </td>

      {/* 25. Charges 1 */}
      <td className="py-3 px-3 text-right font-mono text-slate-600">
        {row.clnCharges1 ? Number(row.clnCharges1).toFixed(2) : '—'}
      </td>

      {/* 26. Charges 2 */}
      <td className="py-3 px-3 text-right font-mono text-slate-600">
        {row.clnCharges2 ? Number(row.clnCharges2).toFixed(2) : '—'}
      </td>

      {/* 27. Status */}
      <td className="py-3 px-3 text-center">
        {val.isValid ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Valid</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700"
            title={val.errors.join(', ')}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Error ({val.errors.length})</span>
          </span>
        )}
      </td>

      {/* 28. Edit Action */}
      <td className="py-3 px-3 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectRow(mainIdx);
          }}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          title="Inspect / Edit Row"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
