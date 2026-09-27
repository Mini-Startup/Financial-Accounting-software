import type { Metadata } from 'next';
import { ExchangePageManager } from '../../components/exchanges/ExchangePageManager';

export const metadata: Metadata = {
  title: 'Exchanges | BizzMate Accounting',
  description: 'Manage financial exchanges, codes, and currency associations.',
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

export default async function ExchangesPage() {
  const exchanges = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges`);
  return <ExchangePageManager initialExchanges={exchanges} />;
}
