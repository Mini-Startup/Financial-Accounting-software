import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden text-center">
      {/* Background glow lines */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 border border-white/5 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 border border-white/5 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 border border-brand-teal/20 rounded-full shadow-[0_0_100px_rgba(13,148,136,0.2)]" />
      
      <div className="relative z-10 max-w-3xl space-y-8 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/40 leading-tight">
          Next Generation <br className="hidden md:block" />
          <span className="text-brand-teal-light">Financial Suite</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-sans">
          Secure, role-based access control and analytics built on modern architecture.
        </p>
        
        <div className="pt-8 flex flex-col items-center gap-4 w-full sm:w-auto">
          {userId ? (
            <div className="bg-surface/60 backdrop-blur-md rounded-2xl top-0 p-8 border border-white/10 w-full flex flex-col items-center">
              <p className="text-white/80 mb-6 text-sm font-medium">You are already authenticated.</p>
              <Link 
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98]"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <Link 
                href="/sign-in"
                className="w-full sm:w-auto px-8 py-3.5 bg-surface/80 hover:bg-surface-hover backdrop-blur border border-white/10 text-white font-medium rounded-xl transition-all active:scale-[0.98] text-center"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up"
                className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] text-center"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
