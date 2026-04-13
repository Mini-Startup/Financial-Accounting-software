'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export function NavBar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  const links = [
    { name: 'Dashboard', href: '/' },
    { name: 'Brokers', href: '/brokers' },
    { name: 'Clients', href: '/clients' },
    { name: 'Scripts', href: '/scripts' },
    { name: 'Ledger', href: '/ledger' },
  ];

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center p-4 pt-6 pointer-events-none">
      <header className="pointer-events-auto flex items-center justify-between px-6 py-3 w-full max-w-5xl bg-white/70 border border-gray-200/60 shadow-xl shadow-gray-200/50 backdrop-blur-xl rounded-2xl relative overflow-hidden">
        {/* Subtle glow effect behind nav */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 opacity-50 z-0"></div>

        <div className="relative z-10 flex items-center gap-8 text-sm font-medium tracking-wide">
          <div className="font-bold text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-500 mr-4">
             BizzMate.
          </div>
          
          <nav className="hidden md:flex gap-1 bg-gray-100/50 border border-gray-200/50 p-1 rounded-xl">
            {links.map(link => {
              const active = pathname === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${active ? 'text-blue-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                >
                  {active && (
                    <span className="absolute inset-0 bg-white shadow-sm border border-gray-200 rounded-lg -z-10"></span>
                  )}
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          {!isSignedIn ? (
            <>
              <div className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition cursor-pointer">
                <SignInButton mode="modal" />
              </div>
              <div className="text-sm font-semibold px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition cursor-pointer">
                <SignUpButton mode="modal" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-sm p-1.5 pl-4 rounded-full">
               <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mr-2">Secure Link</span>
               <div className="shadow-sm rounded-full flex items-center justify-center">
                 <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 rounded-full border border-gray-200" } }} />
               </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
