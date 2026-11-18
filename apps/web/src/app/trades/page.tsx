import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TradesPageManager } from '../../components/trades/TradesPageManager';
import { safeServerFetch } from '@/utils/serverApi';

export const metadata: Metadata = {
  title: 'Trades | BizzMate Accounting',
  description: 'Track, filter, and manage trade blotters, manual trades, and imports.',
};

export const dynamic = 'force-dynamic';

export default async function TradesPage() {
  const [exchanges, accounts, scripts, trades, settlements, expiries] = await Promise.all([
    safeServerFetch('/exchanges?active=true'),
    safeServerFetch('/account-masters'),
    safeServerFetch('/scripts'),
    safeServerFetch('/trades'),
    safeServerFetch('/settlement/list', []),
    safeServerFetch('/expiry-dates?activeOnly=true', []),
  ]);

  return (
    <Suspense fallback={<div>Loading trades...</div>}>
      <TradesPageManager 
        exchanges={exchanges} 
        accounts={accounts} 
        scripts={scripts} 
        initialTrades={trades} 
        settlements={settlements}
        initialExpiries={expiries}
      />
    </Suspense>
  );
}
