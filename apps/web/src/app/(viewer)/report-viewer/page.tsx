import { Suspense } from 'react';
import { ReportViewerManager } from '@/components/report-viewer/ReportViewerManager';

export const metadata = {
  title: 'Report Viewer | BizzMate Accounting',
  description: 'High-fidelity document preview and export engine',
};

export default function ReportViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#2652C8]/30 border-t-[#2652C8] rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-600">Initializing BizzMate Report Engine...</span>
          </div>
        </div>
      }
    >
      <ReportViewerManager />
    </Suspense>
  );
}
