import { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-teal/20 rounded-full blur-[128px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue/20 rounded-full blur-[128px] -z-10" />
      
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Financial Portal
          </h1>
          <p className="text-white/60 mt-2 font-sans">
            Secure access to your accounting dashboard
          </p>
        </div>
        
        {children}
      </div>
    </div>
  );
}
