'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScriptFormModal } from './ScriptFormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ScriptDataTable({
  scripts,
  exchanges,
}: {
  scripts: any[];
  exchanges: any[];
}) {
  const router = useRouter();
  const [editingScript, setEditingScript] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter scripts
  const filteredScripts = useMemo(() => {
    if (!searchQuery) return scripts;
    const q = searchQuery.toLowerCase();
    return scripts.filter(
      (s) =>
        (s.shortName || '').toLowerCase().includes(q) ||
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.exchange?.code || '').toLowerCase().includes(q) ||
        (s.currency?.code || '').toLowerCase().includes(q)
    );
  }, [scripts, searchQuery]);

  // Paginated scripts
  const totalItems = filteredScripts.length;
  const paginatedScripts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredScripts.slice(start, start + pageSize);
  }, [filteredScripts, currentPage, pageSize]);

  // Selection handlers
  const isAllVisibleSelected =
    paginatedScripts.length > 0 &&
    paginatedScripts.every((s) => selectedIds.has(s.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedScripts.forEach((s) => next.delete(s.id));
      } else {
        paginatedScripts.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Script deleted successfully');
        router.refresh();
      } else {
        toast.error('Failed to delete script');
      }
    } catch {
      toast.error('Failed to delete script');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete all ${count} selected scripts?`)) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
            method: 'DELETE',
          })
        )
      );
      toast.success(`${count} scripts deleted successfully`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error('Failed to delete some scripts');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* Top Controls Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search scripts by short name, full name, exchange..."
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        isDeleting={isDeleting}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Main Table Card */}
      <div className="card shadow-xs border border-t-0 border-slate-200 rounded-t-none bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th style={{ width: '140px' }}>Short Name</th>
                <th>Full Name</th>
                <th style={{ width: '120px' }}>Market Lot</th>
                <th style={{ width: '100px' }}>Exchange</th>
                <th style={{ width: '120px' }}>Currency</th>
                <th style={{ width: '90px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedScripts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No scripts found matching your search.
                  </td>
                </tr>
              ) : null}
              {paginatedScripts.map((script) => {
                const isSelected = selectedIds.has(script.id);
                const exCode = script.exchange?.code || script.scriptExchangeMappings?.[0]?.exchange?.code || '—';
                const currCode = script.currency
                  ? `${script.currency.code} ${script.currency.symbol ? `(${script.currency.symbol})` : ''}`
                  : 'USD ($)';

                return (
                  <tr
                    key={script.id}
                    className={isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}
                  >
                    <td className="text-center">
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleToggleRow(script.id)}
                      />
                    </td>
                    <td className="font-mono font-bold text-slate-800">
                      {script.shortName}
                    </td>
                    <td className="font-medium text-slate-900">
                      {script.fullName}
                    </td>
                    <td className="font-semibold text-slate-700 font-mono">
                      {Number(script.lotSize).toLocaleString()}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {exCode}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        {currCode}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingScript(script)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(script.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingScript && (
        <ScriptFormModal
          initialData={editingScript}
          exchanges={exchanges}
          onClose={() => setEditingScript(null)}
        />
      )}
    </div>
  );
}
