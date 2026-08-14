import { CurrencyPageManager } from '../../components/currencies/CurrencyPageManager';

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

export default async function CurrenciesPage() {
  const currencies = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies`);
  return <CurrencyPageManager initialCurrencies={currencies} />;
}
