import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Reports | BizzMate Accounting',
  description: 'Executive financial reporting: Net Position, Settlement Audit, and Financial Settlement Sheet.',
};

export default function ReportsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-[calc(100vh-6rem)] bg-white text-slate-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xs border border-slate-200/80 flex flex-col">
      {children}
    </div>
  );
}
