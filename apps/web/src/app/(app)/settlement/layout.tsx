import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settlement & Carry Forward | BizzMate Accounting',
  description: 'Manage daily position netting, mark-to-market valuation, and settlement cycles.',
};

export default function SettlementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
