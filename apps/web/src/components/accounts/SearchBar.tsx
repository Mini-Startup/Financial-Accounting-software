'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useRef } from 'react';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    }, 300); // 300ms debounce
  };

  return (
    <div className="relative">
      <input 
        type="search" 
        placeholder="Search accounts..." 
        defaultValue={searchParams.get('search') || ''} 
        onChange={handleSearch} 
        className="w-full sm:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-black bg-white"
      />
      {isPending && <span className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"></span>}
    </div>
  );
}
