import { Suspense } from 'react';
import { TradesPageManager } from '../../components/trades/TradesPageManager';

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
    safeFetch('http://localhost:4000/exchanges?active=true'),
    safeFetch('http://localhost:4000/accounts'),
    safeFetch('http://localhost:4000/scripts'),
    safeFetch('http://localhost:4000/trades'),
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
