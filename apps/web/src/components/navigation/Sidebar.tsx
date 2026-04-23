"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Brokers', path: '/brokers', icon: '🏦' },
    { name: 'Clients', path: '/clients', icon: '👥' },
    { name: 'Scripts', path: '/scripts', icon: '📄' },
    { name: 'Ledger', path: '/ledger', icon: '📒' },
    { name: 'Trades', path: '/trades', icon: '📈' },
    { name: 'Trade Import', path: '/trades/import', icon: '📥' },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg shadow-sm flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-title text-(--color-secondary)">BizzMate FAS</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        <div className="mb-4 px-2">
          <p className="text-caption">Menu</p>
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-body-sm font-medium ${
                isActive 
                  ? 'bg-[var(--color-primary)] text-white' 
                  : 'text-[var(--color-secondary)] hover:bg-[var(--color-background)]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-[var(--color-border)] flex items-center gap-3">
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-9 h-9"
            }
          }}
        />
        <div className="flex flex-col">
          <span className="text-body-sm font-medium text-[var(--color-secondary)]">My Account</span>
          <span className="text-caption">Settings & Profile</span>
        </div>
      </div>
    </aside>
  );
}
