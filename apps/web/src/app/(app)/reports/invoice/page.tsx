import { Metadata } from 'next';
import { InvoiceReportManager } from '@/components/reports/InvoiceReportManager';

export const metadata: Metadata = {
  title: 'Invoice Report (Futures Bill) | BizzMate FAS',
  description: 'Bilateral settled trade invoices and futures bills grouped by client, broker, and script.',
};

export default function InvoiceReportPage() {
  return (
    <div className="max-w-[1600px] mx-auto">
      <InvoiceReportManager />
    </div>
  );
}
