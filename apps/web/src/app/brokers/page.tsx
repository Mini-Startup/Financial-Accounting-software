import { EntityPageManager } from '../../components/accounts/EntityPageManager';

export default async function BrokersPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `&search=${encodeURIComponent(searchParams.search)}` : '';
  
  let accounts = [];
  try {
    const res = await fetch(`http://localhost:4000/accounts?group=Sundry%20Creditors${query}`, { cache: 'no-store' });
    if (res.ok) accounts = await res.json();
  } catch (e) {
    console.error("Failed to fetch brokers from API");
  }

  return (
    <EntityPageManager 
      title="Brokers" 
      entityLabel="Broker"
      groupName="Sundry Creditors" 
      accounts={accounts} 
    />
  );
}
