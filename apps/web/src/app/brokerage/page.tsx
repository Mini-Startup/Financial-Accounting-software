import { BrokeragePageManager } from '../../components/brokerage/BrokeragePageManager';

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
    safeFetch('http://localhost:4000/brokerages'),
    safeFetch('http://localhost:4000/exchanges?active=true'),
    safeFetch('http://localhost:4000/accounts'),
    safeFetch('http://localhost:4000/scripts'),
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
