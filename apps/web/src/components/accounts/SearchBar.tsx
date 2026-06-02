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
        className="input w-full sm:w-64"
      />
      {isPending && <span className="absolute right-3 top-3 w-4 h-4 rounded-full border-2 border-[var(--color-mist)] border-t-[var(--color-emerald)] animate-spin"></span>}
    </div>
  );
}
