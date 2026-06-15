import { ScriptPageManager } from '../../components/scripts/ScriptPageManager';

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

export default async function ScriptsPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `?search=${encodeURIComponent(searchParams.search)}` : '';
  
  const [scripts, exchanges] = await Promise.all([
    safeFetch(`http://localhost:4000/scripts${query}`),
    safeFetch('http://localhost:4000/exchanges?active=true'),
  ]);

  return (
    <ScriptPageManager scripts={scripts} exchanges={exchanges} />
  );
}
