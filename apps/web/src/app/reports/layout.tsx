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
    <div className="w-full min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
