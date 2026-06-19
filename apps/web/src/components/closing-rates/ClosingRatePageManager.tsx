'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ClosingRateDataTable } from './ClosingRateDataTable';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { Plus, UploadCloud, ArrowLeft, AlertCircle } from 'lucide-react';

export function ClosingRatePageManager({ 
  initialClosingRates,
  exchanges,
  scripts
}: { 
  initialClosingRates: any[];
  exchanges: any[];
  scripts: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportParam = searchParams.get('import') === 'true';

  const [viewMode, setViewMode] = useState<'list' | 'import'>(isImportParam ? 'import' : 'list');
  const [isAdding, setIsAdding] = useState(false);

  // Sync state with query parameters (e.g. sidebar links)
  useEffect(() => {
    setViewMode(isImportParam ? 'import' : 'list');
  }, [isImportParam]);

  // Mock states for File Import UI
  const [selectedExchange, setSelectedExchange] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('');
  const [importType, setImportType] = useState('closing_rates');

  const handleImportBack = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('import');
    window.history.pushState({}, '', url.toString());
    setViewMode('list');
    router.refresh();
  };

  if (viewMode === 'import') {
    return (
      <div className="space-y-6">
        {/* Import Header */}
        <div className="flex items-center gap-4 border-b border-[var(--color-border-light)] pb-6">
          <button 
            onClick={handleImportBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
            title="Back to Closing Rates"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-h2 font-display">Import Closing Rates</h1>
            <p className="text-sm text-[var(--color-slate)] mt-1">
              Select configurations and upload your CSV or TXT file to process daily closing rates.
            </p>
          </div>
        </div>

        {/* Mock Import Settings Form */}
        <div className="card p-6 bg-white border border-[var(--color-border-light)] shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Exchange Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Exchange</label>
              <select 
                value={selectedExchange} 
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="input w-full text-slate-900"
              >
                <option value="">Select Exchange</option>
                {exchanges.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.code}</option>
                ))}
              </select>
            </div>

            {/* Broker Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Broker</label>
              <select 
                value={selectedBroker} 
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="input w-full text-slate-900"
              >
                <option value="">Select Broker</option>
                <option value="broker1">Mock Broker 1</option>
                <option value="broker2">Mock Broker 2</option>
              </select>
            </div>

            {/* Import Type Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Import Type</label>
              <select 
                value={importType} 
                onChange={(e) => setImportType(e.target.value)}
                className="input w-full text-slate-900"
              >
                <option value="closing_rates">Closing Rates</option>
              </select>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div className="mt-8 border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-forest)]/50 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all duration-200 cursor-not-allowed group">
            <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-[var(--color-forest)] transition-colors mb-4" />
            <p className="text-sm font-semibold text-slate-700">Drag & drop files here, or browse</p>
            <p className="text-xs text-slate-400 mt-1">Supports CSV and TXT broker export files</p>
          </div>

          {/* Banner info */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Note:</span> The Closing Rates file import is currently a visual prototype and is not functional yet. Please use the <button onClick={handleImportBack} className="underline font-semibold hover:text-amber-900">Manual Entry</button> page to record rates.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6">
        <div>
          <h1 className="text-h2 font-display">Closing Rates</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Manage daily closing rates used for calculating portfolios, profit/loss, and account balances.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Closing Rate
          </button>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('import', 'true');
              window.history.pushState({}, '', url.toString());
              setViewMode('import');
            }}
            className="btn btn--secondary flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-[var(--color-primary)]" /> Import File
          </button>
        </div>
      </div>

      <ClosingRateDataTable 
        closingRates={initialClosingRates} 
        exchanges={exchanges} 
        scripts={scripts} 
      />

      {isAdding && (
        <ClosingRateFormModal 
          exchanges={exchanges}
          scripts={scripts}
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
