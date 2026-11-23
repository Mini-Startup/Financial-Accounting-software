import type { Metadata } from 'next';
import { ExchangePageManager } from '@/components/exchanges/ExchangePageManager';
import { safeServerFetch } from '@/utils/serverApi';

export const metadata: Metadata = {
  title: 'Exchanges | BizzMate Accounting',
  description: 'Manage financial exchanges, codes, and currency associations.',
};

export const dynamic = 'force-dynamic';

export default async function ExchangesPage() {
  const exchanges = await safeServerFetch('/exchanges', []);
  return <ExchangePageManager initialExchanges={exchanges} />;
}
