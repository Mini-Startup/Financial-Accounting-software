import type { Metadata } from 'next';
import { EntityPageManager } from '@/components/accounts/EntityPageManager';
import { safeServerFetch } from '@/utils/serverApi';

export const metadata: Metadata = {
  title: 'Brokers | BizzMate Accounting',
  description: 'Manage broker accounts, contact details, and account balances.',
};

export const dynamic = 'force-dynamic';

export default async function BrokersPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `&search=${encodeURIComponent(searchParams.search)}` : '';
  
  const accounts = await safeServerFetch(`/account-masters?group=Sundry%20Creditors${query}`, []);

  return (
    <EntityPageManager 
      title="Brokers" 
      entityLabel="Broker"
      groupName="Sundry Creditors" 
      accounts={accounts} 
    />
  );
}
