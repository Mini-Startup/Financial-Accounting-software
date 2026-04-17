import { ScriptPageManager } from '../../components/scripts/ScriptPageManager';

export default async function ScriptsPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `?search=${encodeURIComponent(searchParams.search)}` : '';
  
  let scripts = [];
  try {
    const res = await fetch(`http://localhost:4000/scripts${query}`, { cache: 'no-store' });
    if (res.ok) scripts = await res.json();
  } catch (e) {
    console.error("Failed to fetch scripts from API");
  }

  return (
    <ScriptPageManager accounts={scripts} />
  );
}
