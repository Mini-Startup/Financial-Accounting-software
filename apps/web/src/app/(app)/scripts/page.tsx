import type { Metadata } from 'next';
import { ScriptPageManager } from '@/components/scripts/ScriptPageManager';
import { safeServerFetch } from '@/utils/serverApi';

export const metadata: Metadata = {
  title: 'Scripts & Securities | BizzMate Accounting',
  description: 'Manage scripts, tick codes, lot sizes, and contract specifications.',
};

export const dynamic = 'force-dynamic';

export default async function ScriptsPage(props: { searchParams: Promise<{ search?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.search ? `?search=${encodeURIComponent(searchParams.search)}` : '';
  
  const [scripts, exchanges] = await Promise.all([
    safeServerFetch(`/scripts${query}`, []),
    safeServerFetch('/exchanges?active=true', []),
  ]);

  return (
    <ScriptPageManager scripts={scripts} exchanges={exchanges} />
  );
}
