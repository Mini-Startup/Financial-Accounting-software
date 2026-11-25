import type { Metadata } from 'next';
import { RecycleBinManager } from '@/components/recycle-bin/RecycleBinManager';

export const metadata: Metadata = {
  title: 'Recycle Bin & Data Recovery | BizzMate Accounting',
  description: 'View and restore deleted trades, accounts, closing rates, vouchers, and masters.',
};

export const dynamic = 'force-dynamic';

async function getInitialDeletedData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/recycle-bin`, { cache: 'no-store' });
    if (!res.ok) return undefined;
    return await res.json();
  } catch (err) {
    return undefined;
  }
}

export default async function RecycleBinPage() {
  const initialData = await getInitialDeletedData();
  return <RecycleBinManager initialData={initialData} />;
}
