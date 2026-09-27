import type { Metadata } from 'next';
import { BrokeragePageManager } from '../../components/brokerage/BrokeragePageManager';

export const metadata: Metadata = {
  title: 'Brokerage Rules | BizzMate Accounting',
  description: 'Configure and resolve client and broker tariff commission rules.',
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

export default async function BrokeragePage() {
  const [brokerages, exchanges, accounts, scripts] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges?active=true`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`),
  ]);

  return (
    <BrokeragePageManager 
      initialBrokerages={brokerages} 
      exchanges={exchanges} 
      accounts={accounts} 
      scripts={scripts} 
    />
  );
}
