import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TradesPageManager } from '../../components/trades/TradesPageManager';

export const metadata: Metadata = {
  title: 'Trades | BizzMate Accounting',
  description: 'Track, filter, and manage trade blotters, manual trades, and imports.',
};

export const dynamic = 'force-dynamic';

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function TradesPage() {
  const [exchanges, accounts, scripts, trades] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges?active=true`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/trades`),
  ]);

  return (
    <Suspense fallback={<div>Loading trades...</div>}>
      <TradesPageManager 
        exchanges={exchanges} 
        accounts={accounts} 
        scripts={scripts} 
        initialTrades={trades} 
      />
    </Suspense>
  );
}
