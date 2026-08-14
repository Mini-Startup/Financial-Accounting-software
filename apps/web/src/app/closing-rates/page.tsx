import { ClosingRatePageManager } from '../../components/closing-rates/ClosingRatePageManager';

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

export default async function ClosingRatesPage() {
  const [closingRates, exchanges, scripts, currencies] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges?active=true`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies`),
  ]);

  return (
    <ClosingRatePageManager 
      initialClosingRates={closingRates} 
      exchanges={exchanges} 
      scripts={scripts} 
      currencies={currencies}
    />
  );
}
