import { LedgerPageManager } from '../../components/ledger/LedgerPageManager';

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

export default async function LedgerPage() {
  const [accounts, groups] = await Promise.all([
    safeFetch('http://localhost:4000/accounts?excludeGroups=Sundry%20Debtors,Sundry%20Creditors'),
    safeFetch('http://localhost:4000/groups'),
  ]);

  return <LedgerPageManager initialAccounts={accounts} groups={groups} />;
}
