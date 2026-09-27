'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function BrokerageDataTable({ brokerages }: { brokerages: any[] }) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brokerage rule?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Brokerage rule deleted successfully');
        router.refresh();
      } else {
        throw new Error('Failed to delete brokerage rule');
      }
    } catch(e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to delete right now.');
    }
  };

  return (
    <div className="card overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/60">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Exchange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type / Scope</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Key Values</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-gray-100">
            {brokerages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">No brokerage rules found.</td>
              </tr>
            ) : null}
            {brokerages.map((rule) => {
              const typeStr = rule.type === 'AMOUNT' ? 'Flat Amount' : 'Percentage';
              const scopeStr = rule.scope === 'DEFAULT' ? 'Default' : `Script: ${rule.script?.fullName || 'Unknown'}`;
              
              let valueStr = '';
              if (rule.type === 'AMOUNT') {
                valueStr = `Base: ${rule.baseAmount}, Fee: ${rule.flatFee}`;
              } else {
                valueStr = `Trading: ${rule.tradingBuyPct}%/${rule.tradingSellPct}% (min ${rule.tradingMinFee})`;
              }

              return (
                <tr key={rule.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.exchange?.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{rule.account?.fldName}</div>
                    <div className="text-xs text-gray-500 uppercase">{rule.appliesTo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{typeStr}</div>
                    <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">{scopeStr}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{valueStr}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-500 hover:text-red-700 font-semibold transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
