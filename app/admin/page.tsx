import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Double check admin role on server side just in case
  const role = user.publicMetadata?.role as string;
  
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground relative">
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[128px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              Admin Portal
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                Restricted Area
              </span>
            </h1>
            <p className="text-slate-400 mt-2">
              System configuration and user management.
            </p>
          </div>
        </header>

        <div className="bg-surface/50 backdrop-blur-xl border border-red-500/20 p-8 rounded-3xl">
          <h2 className="text-xl font-heading font-semibold text-rose-300 mb-4">
            Security Clearance Granted
          </h2>
          <p className="text-slate-300">
            You are viewing this page because your Clerk user account has `role: &quot;admin&quot;` set in its `publicMetadata`.
          </p>
        </div>
      </div>
    </div>
  );
}
