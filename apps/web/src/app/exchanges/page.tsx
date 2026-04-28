import { ExchangePageManager } from '../../components/exchanges/ExchangePageManager';

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
  const exchanges = await safeFetch('http://localhost:4000/exchanges');
  return <ExchangePageManager initialExchanges={exchanges} />;
}
