import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settlement Audit Report | BizzMate Accounting',
  description: 'Detailed trade provenance and categorization across Regular, Carry Forward, Back Forward, and Settlement entries.',
};

export default function SettlementDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
