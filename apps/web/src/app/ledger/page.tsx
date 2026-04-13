import { EntityPageManager } from '../../components/accounts/EntityPageManager';

export default async function LedgerPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `&search=${encodeURIComponent(searchParams.search)}` : '';
  
  let accounts = [];
  try {
    const res = await fetch(`http://localhost:4000/accounts?group=Ledger${query}`, { cache: 'no-store' });
    if (res.ok) accounts = await res.json();
  } catch (e) {
    console.error("Failed to fetch ledger from API");
  }

  return (
    <EntityPageManager 
      title="Ledger" 
      groupName="Ledger" 
      accounts={accounts} 
    />
  );
}
