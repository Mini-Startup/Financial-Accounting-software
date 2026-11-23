import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Settlement Sheet | BizzMate Accounting',
  description: 'Executive double-entry settlement clearing with client, broker, and firm reconciliation.',
};

export default function SettlementSummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
