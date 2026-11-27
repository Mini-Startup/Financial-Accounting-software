import type { Metadata } from 'next';
import { FileImportRulesManager } from '@/components/file-import-rules/FileImportRulesManager';

export const metadata: Metadata = {
  title: 'File Import Rules | BizzMate Accounting',
  description: 'Manage CSV file import templates, dynamic column mappings, and chargeable rules.',
};

export const dynamic = 'force-dynamic';

async function getTemplates() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/file-import-templates`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch file import templates:', err);
    return [];
  }
}

export default async function FileImportRulesPage() {
  const templates = await getTemplates();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <FileImportRulesManager initialTemplates={templates} />
    </div>
  );
}
