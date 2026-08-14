import { CheckCircle2, Upload } from 'lucide-react';

interface ImportResultPanelProps {
  importResult: { importedCount: number; failedCount: number };
  fileName: string;
  onReset: () => void;
  onBack?: () => void;
}

export function ImportResultPanel({ importResult, fileName, onReset, onBack }: ImportResultPanelProps) {
  return (
    <div className="max-w-md mx-auto py-10">
      <div className="card text-center p-8 space-y-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-[var(--color-positive)] mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-charcoal)]">Import Completed Successfully</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            Processed trade file: <span className="font-semibold">{fileName}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-[var(--color-border-light)] py-4">
          <div>
            <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Imported</div>
            <div className="text-2xl font-bold text-[var(--color-positive)]">{importResult.importedCount}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Skipped (Errors)</div>
            <div className="text-2xl font-bold text-[var(--color-negative)]">{importResult.failedCount}</div>
          </div>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <button onClick={onReset} className="btn btn--secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Another
          </button>
          {onBack && (
            <button onClick={onBack} className="btn btn--primary flex items-center gap-2">
              View Trades List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
