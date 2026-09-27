import type { Metadata } from 'next';
import { ScriptPageManager } from '../../components/scripts/ScriptPageManager';

export const metadata: Metadata = {
  title: 'Scripts & Securities | BizzMate Accounting',
  description: 'Manage scripts, tick codes, lot sizes, and contract specifications.',
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

export default async function ScriptsPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `?search=${encodeURIComponent(searchParams.search)}` : '';
  
  const [scripts, exchanges] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts${query}`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges?active=true`),
  ]);

  return (
    <ScriptPageManager scripts={scripts} exchanges={exchanges} />
  );
}
