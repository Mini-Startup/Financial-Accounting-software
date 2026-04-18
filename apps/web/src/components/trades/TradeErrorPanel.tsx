'use client';

import { useState } from 'react';
import type { ParseError } from '../../lib/tradeParser';

interface TradeErrorPanelProps {
  errors: ParseError[];
}

export function TradeErrorPanel({ errors }: TradeErrorPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (errors.length === 0) return null;

  return (
    <div className="trade-error-panel trade-animate-in">
      <div
        className="trade-error-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        <div className="trade-error-header-left">
          <span>⚠️</span>
          <span>{errors.length} row{errors.length > 1 ? 's' : ''} failed to parse</span>
        </div>
        <span className={`trade-error-chevron ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="trade-error-list">
          {/* Column headers */}
          <div
            className="trade-error-row"
            style={{
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#b91c1c',
              background: 'rgba(254, 202, 202, 0.2)',
            }}
          >
            <span>Row #</span>
            <span>Raw Data</span>
            <span>Reason</span>
          </div>

          {errors.map((err, idx) => (
            <div className="trade-error-row" key={idx}>
              <span className="trade-error-rownum">#{err.row}</span>
              <span className="trade-error-raw" title={err.rawLine}>
                {err.rawLine}
              </span>
              <span className="trade-error-reason">{err.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
