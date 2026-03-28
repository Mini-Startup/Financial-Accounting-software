import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar Skeleton */}
      <aside className="w-64 border-r border-border bg-surface/30 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-heading font-bold text-lg text-teal-500">
            Financial Portal
          </span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 rounded-lg bg-teal-500/10 text-teal-400 font-medium border border-teal-500/20">
            Overview
          </Link>
          <Link href="/admin" className="block px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            Admin Area
          </Link>
          {/* Add more links here */}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-xl font-medium hidden sm:block">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto relative">
          {/* Glow effects */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-teal/10 rounded-full blur-[128px] pointer-events-none" />
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
