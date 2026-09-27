import type { Metadata } from 'next';
import { EntityPageManager } from '../../components/accounts/EntityPageManager';

export const metadata: Metadata = {
  title: 'Clients | BizzMate Accounting',
  description: 'Manage client accounts, contact details, and account balances.',
};

export default async function ClientsPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `&search=${encodeURIComponent(searchParams.search)}` : '';
  
  let accounts = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters?group=Sundry%20Debtors${query}`, { cache: 'no-store' });
    if (res.ok) accounts = await res.json();
  } catch (e) {
    console.error("Failed to fetch clients from API");
  }

  return (
    <EntityPageManager 
      title="Clients" 
      entityLabel="Client"
      groupName="Sundry Debtors" 
      accounts={accounts} 
    />
  );
}
