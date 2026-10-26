import type { Metadata } from 'next';
import { ClosingRatePageManager } from '../../components/closing-rates/ClosingRatePageManager';

export const metadata: Metadata = {
  title: 'Closing Rates | BizzMate Accounting',
  description: 'Manage daily script closing rates for mark-to-market valuation.',
};

export const dynamic = 'force-dynamic';

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch from ${url}:`, err);
    return [];
  }
}

export default async function ClosingRatesPage() {
  const [closingRates, exchanges, scripts, currencies, accounts] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges?active=true`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`),
  ]);

  return (
    <ClosingRatePageManager 
      initialClosingRates={closingRates} 
      exchanges={exchanges} 
      scripts={scripts} 
      currencies={currencies}
      accounts={accounts}
    />
  );
}
