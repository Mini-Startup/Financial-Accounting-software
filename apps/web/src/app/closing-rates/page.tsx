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
  const [closingRates, exchanges, scripts] = await Promise.all([
    safeFetch('http://localhost:4000/closing-rates'),
    safeFetch('http://localhost:4000/exchanges?active=true'),
    safeFetch('http://localhost:4000/scripts'),
  ]);

  return (
    <ClosingRatePageManager 
      initialClosingRates={closingRates} 
      exchanges={exchanges} 
      scripts={scripts} 
    />
  );
}
