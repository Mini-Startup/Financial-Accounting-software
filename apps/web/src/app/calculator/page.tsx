import { TradeCalculator } from '../../components/calculator/TradeCalculator';

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

export default async function CalculatorPage() {
  const [exchanges, accounts, scripts] = await Promise.all([
    safeFetch('http://localhost:4000/exchanges?active=true'),
    safeFetch('http://localhost:4000/accounts'),
    safeFetch('http://localhost:4000/scripts'),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Trade Calculator</h1>
        <p className="text-gray-500 mt-1">Real-time breakdown of brokerage fees and trade profits.</p>
      </div>

      <TradeCalculator 
        exchanges={exchanges} 
        accounts={accounts} 
        scripts={scripts} 
      />
    </div>
  );
}
