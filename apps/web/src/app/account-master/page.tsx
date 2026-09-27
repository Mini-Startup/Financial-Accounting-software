import type { Metadata } from 'next';
import { AccountMasterPageManager } from '../../components/account-master/AccountMasterPageManager';

export const metadata: Metadata = {
  title: 'Account Master | BizzMate Accounting',
  description: 'Manage general ledger account masters and banking details.',
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

export default async function AccountMasterPage() {
  const [accounts, groups] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters?excludeGroups=Sundry%20Debtors,Sundry%20Creditors`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/groups`),
  ]);

  return <AccountMasterPageManager initialAccounts={accounts} groups={groups} />;
}
