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
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts?excludeGroups=Sundry%20Debtors,Sundry%20Creditors`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/groups`),
  ]);

  return <LedgerPageManager initialAccounts={accounts} groups={groups} />;
}
