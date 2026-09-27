import type { Metadata } from 'next';
import { LedgerReportManager } from '../../components/ledger/LedgerReportManager';

export const metadata: Metadata = {
  title: 'Ledger Statement | BizzMate Accounting',
  description: 'Detailed financial statement and transaction journal for any party account.',
};

export const dynamic = 'force-dynamic';

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    return [];
  }
}

export default async function LedgerReportPage() {
  const accounts = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`);

  return <LedgerReportManager accounts={accounts} />;
}
