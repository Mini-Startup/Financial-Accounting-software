import type { Metadata } from 'next';
import { EntityPageManager } from '../../components/accounts/EntityPageManager';
import { safeServerFetch } from '@/utils/serverApi';

export const metadata: Metadata = {
  title: 'Clients | BizzMate Accounting',
  description: 'Manage client accounts, contact details, and account balances.',
};

export const dynamic = 'force-dynamic';

export default async function ClientsPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `&search=${encodeURIComponent(searchParams.search)}` : '';
  
  const accounts = await safeServerFetch(`/account-masters?group=Sundry%20Debtors${query}`, []);

  return (
    <EntityPageManager 
      title="Clients" 
      entityLabel="Client"
      groupName="Sundry Debtors" 
      accounts={accounts} 
    />
  );
}
