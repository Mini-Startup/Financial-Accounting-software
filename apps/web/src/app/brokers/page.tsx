import { EntityPageManager } from '../../components/accounts/EntityPageManager';

export default async function BrokersPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `&search=${encodeURIComponent(searchParams.search)}` : '';
  
  let accounts = [];
  try {
    console.log("Fetching brokers from API...")
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts?group=Sundry%20Creditors${query}`, { cache: 'no-store' });
    console.log(`${process.env.NEXT_PUBLIC_API_URL}/accounts?group=Sundry%20Creditors${query}`)
    if (res.ok) accounts = await res.json();
    console.log("Brokers fetched successfully")
    console.log(accounts)
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
